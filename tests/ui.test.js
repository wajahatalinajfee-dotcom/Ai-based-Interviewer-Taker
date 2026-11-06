import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDb, useTestDb } from './helpers/db.js';
import { JSDOM, ResourceLoader, VirtualConsole } from 'jsdom';
import { installGeminiMock } from './helpers/gemini-mock.js';

useTestDb(); process.env.JWT_SECRET = 'test'; process.env.GEMINI_API_KEY = 'test'; process.env.QUESTIONS = '3'; process.env.HR_QUESTIONS = '2';
const realFetch = installGeminiMock();
await resetTestDb();
const { default: app } = await import('../src/app.js');
await (await import('../src/repositories/index.js')).repo.init();
const server = app.listen(0); await new Promise((r) => server.once('listening', r));
const root = `http://localhost:${server.address().port}`;

let cookie = ''; const errors = [];
const vc = new VirtualConsole(); vc.on('jsdomError', (e) => errors.push(e.message));
class Loader extends ResourceLoader { fetch(url, o) { return url.startsWith(root) ? super.fetch(url, o) : Promise.resolve(Buffer.from('')); } }
const dom = await JSDOM.fromURL(root + '/', {
  runScripts: 'dangerously', resources: new Loader(), pretendToBeVisual: true, virtualConsole: vc,
  beforeParse(w) {
    w.scrollTo = () => {};
    w.fetch = async (u, o = {}) => {
      const r = await realFetch(new URL(u, root), { ...o, headers: { ...(o.headers || {}), ...(cookie ? { cookie } : {}) } });
      const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0];
      return r;
    };
    w.speechSynthesis = { speak(u) { setTimeout(() => { u.onstart && u.onstart(); u.onend && u.onend(); }, 5); }, cancel() {}, getVoices: () => [] };
    w.SpeechSynthesisUtterance = function (t) { this.text = t; };
    w.webkitSpeechRecognition = class { // pretends the user says "my spoken answer"
      start() { setTimeout(() => { this.onstart && this.onstart(); this.onresult && this.onresult({ resultIndex: 0, results: [Object.assign([{ transcript: 'my spoken answer' }], { isFinal: true })] }); }, 10); }
      stop() { setTimeout(() => this.onend && this.onend(), 5); }
    };
    // Mic permission prompt that nobody answers: the app must not wait for it.
    Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: () => new Promise(() => {}) }, configurable: true });
  },
});
const w = dom.window, $ = (id) => w.document.getElementById(id);
const until = async (fn, label, ms = 10000) => { const t = Date.now(); while (Date.now() - t < ms) { if (fn()) return; await new Promise((r) => setTimeout(r, 25)); } throw new Error(`Timed out waiting for: ${label}. Setup message: "${$('serr').textContent}". Status: "${$('status').textContent}". Script errors: ${errors.join(' | ')}`); };
after(async () => { w.speechSynthesis.speak = () => {}; await w.stopListen(); await new Promise((r) => setTimeout(r, 200)); w.close(); server.close(); });
let firstQ = '', secondQ = '';

test('homepage shows, signup lands on the dashboard with the profile header', async () => {
  await until(() => $('navActions').innerHTML.includes('Get started'), 'homepage nav');
  assert.ok(!$('home').hidden); assert.ok($('appbar').hidden);
  w.openAuth('signup'); $('aname').value = 'Sam Khan'; $('aemail').value = 'sam@example.com'; $('apass').value = 'password123'; $('asubmit').click();
  await until(() => !$('dash').hidden, 'dashboard');
  assert.equal(w.location.pathname, '/dashboard'); assert.ok(!$('appbar').hidden); assert.equal($('whoName').textContent, 'Sam');
});

test('the question appears even while the mic permission prompt is unanswered', async () => {
  w.go('setup'); $('start').click();
  await until(() => $('q').textContent.length > 10, 'question text');
  firstQ = $('q').textContent;
  assert.equal(w.location.pathname, '/interview'); assert.ok($('home').hidden); assert.ok(!$('appbar').hidden);
  assert.equal($('prog').querySelectorAll('.pg').length, 3);
  assert.equal($('qlist').children.length, 1); assert.notEqual($('qlist').textContent, firstQ);
});

test('spoken words land in the answer box; Done saves it; dots show one answer at a time', async () => {
  await until(() => $('ans').value === 'my spoken answer', 'transcript in the answer box');
  $('submit').click();
  await until(() => $('prog').querySelector('.pg.ok'), 'answer 1 reviewed');
  await until(() => $('q').textContent !== firstQ && $('q').textContent.length > 10, 'second question');
  secondQ = $('q').textContent;
  const pick = (n) => $('prog').children[n].click(); // the fake voice is instant, so choose dots explicitly instead of racing the app
  pick(0);
  assert.match($('rows').textContent, /my spoken answer/); assert.match($('rows').textContent, /Good\./);
  assert.match($('qlist').children[0].className, /now/); assert.doesNotMatch($('rows').textContent, /Waiting/);
  pick(1);
  assert.match($('rows').textContent, /Waiting for your answer/); assert.doesNotMatch($('rows').textContent, /my spoken answer/);
});

test('an unfinished interview can be continued from the dashboard', async () => {
  w.go('dash');
  await until(() => $('dbody').querySelector('.resume-btn'), 'Continue button');
  $('dbody').querySelector('.resume-btn').click();
  await until(() => !$('room').hidden && $('q').textContent === secondQ, 'resumed on the same question');
  assert.ok($('prog').children[0].classList.contains('ok')); assert.match(($('rows').textContent), /Waiting|Question 2/);
});

test('no script errors happened in the page', () => assert.deepEqual(errors, []));
