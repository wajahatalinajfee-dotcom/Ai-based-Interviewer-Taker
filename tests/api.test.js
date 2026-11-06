import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDb, useTestDb } from './helpers/db.js';
import { _resetSessions } from '../src/services/session.store.js';

useTestDb(); process.env.JWT_SECRET = 'test-secret'; process.env.GEMINI_API_KEY = 'test'; process.env.QUESTIONS = '3'; process.env.HR_QUESTIONS = '2';
const realFetch = globalThis.fetch;
let forced = [], fail429 = false, lastPrompt = '';
const rw = () => Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');

function reply(p) {
  if (p.includes('Write ONE interview question')) return { question: forced.shift() || `Describe how ${rw()} differs from ${rw()} and ${rw()} in practice`, code: null, rubric: ['a', 'b', 'c'] };
  if (p.includes('Score accuracy, depth and clarity')) return { accuracy: 9, depth: 9, clarity: 9, missed: [], feedback: 'Good.', better_answer: 'x', tip: 'y' };
  if (p.includes('JavaScript coding problem')) return { title: 'Add numbers', description: 'Add two numbers.', functionName: 'add', starterCode: 'function add(a,b){}', tests: [{ args: [1, 2], expected: 3 }, { args: [2, 2], expected: 4 }, { args: [0, 0], expected: 0 }], hint: 'h' };
  if (p.includes('Review correctness')) return { correctness: 8, efficiency: 8, readability: 8, explanation_match: 8, issues: [], feedback: 'Nice.', tip: 't', optimized_code: '' };
  if (p.includes('behavioral interview question')) return { question: `Tell me about ${rw()} teamwork ${rw()} example ${rw()}` };
  if (p.includes('STAR method')) return { star: { situation: true, task: false, action: true, result: true }, structure: 9, ownership: 8, clarity: 8, feedback: 'ok', better_answer: 'b', tip: 't' };
  if (p.includes('honest summary')) return { summary: 's', strengths: ['a'], weak_topics: [{ topic: 't', reason: 'r' }], plan_7_days: ['d'], communication_tips: ['c'], suggested_level: 'L2' };
  throw new Error('unmocked prompt: ' + p.slice(0, 60));
}
globalThis.fetch = async (url, opts) => {
  if (!String(url).includes('generativelanguage')) return realFetch(url, opts);
  if (fail429) { fail429 = false; return new Response('{}', { status: 429 }); }
  lastPrompt = JSON.parse(opts.body).contents[0].parts[0].text;
  const body = reply(lastPrompt);
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 });
};

await resetTestDb();
const { default: app } = await import('../src/app.js');
await (await import('../src/repositories/index.js')).repo.init();
const server = app.listen(0); await new Promise((r) => server.once('listening', r));
const root = `http://localhost:${server.address().port}`;
const call = async (path, body, cookie) => {
  const r = await realFetch(root + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json(), cookie: (r.headers.get('set-cookie') || '').split(';')[0] };
};
const I = '/api/interview';
after(() => server.close());

test('health and unknown routes', async () => {
  assert.deepEqual((await call('/api/health')).body, { ok: true });
  assert.equal((await call('/api/nope')).status, 404);
});

test('bad input is rejected with 400 and unknown sessions with 404', async () => {
  assert.equal((await call(I + '/start', { role: 'x', level: 1 })).status, 400);
  assert.equal((await call(I + '/answer', { id: 'nope', answer: 'hi' })).status, 404);
  assert.equal((await call(I + '/coding/start', { id: 'nope' })).status, 404);
  assert.equal((await call(I + '/answer', {})).status, 400);
});

test('quota errors from Gemini surface as 429', async () => {
  fail429 = true;
  const r = await call(I + '/start', { role: 'mern', level: 0 });
  assert.equal(r.status, 429); assert.match(r.body.error, /quota/i);
});

test('repeated question is rejected and regenerated', async () => {
  const same = 'Explain how closures capture variables inside JavaScript functions';
  forced = [same];
  assert.equal((await call(I + '/start', { role: 'basics', level: 1 })).body.q.question, same);
  forced = [same, same];
  const second = await call(I + '/start', { role: 'basics', level: 1 });
  assert.notEqual(second.body.q.question, same);
});

test('full interview: technical, level-up, coding, HR, report', async () => {
  const s = await call(I + '/start', { role: 'mern', level: 0 });
  assert.equal(s.status, 200); assert.equal(s.body.total, 3);
  const id = s.body.id;
  let r;
  for (let i = 0; i < 3; i++) r = await call(I + '/answer', { id, answer: 'um I would use a reducer, basically' });
  assert.equal(r.body.levelChanged, 1); assert.equal(r.body.level, 1); assert.equal(r.body.done, true);
  assert.equal(r.body.next, undefined); assert.equal(r.body.eval.score, 9);

  assert.equal((await call(I + '/coding/submit', { id, code: 'x', results: [{ pass: true }] })).status, 409);
  const c = await call(I + '/coding/start', { id });
  assert.equal(c.body.functionName, 'add'); assert.ok(c.body.tests.length >= 3);
  const cs = await call(I + '/coding/submit', { id, approach: 'add them', code: 'function add(a,b){return a+b}', results: [{ pass: true }, { pass: true }, { pass: false, error: 'x' }] });
  assert.equal(cs.status, 200); assert.equal(cs.body.score, 8); assert.equal(cs.body.passed, 2);

  assert.equal((await call(I + '/hr/answer', { id, answer: 'hi' })).status, 409);
  const h = await call(I + '/hr/start', { id });
  assert.equal(h.body.total, 2);
  const h1 = await call(I + '/hr/answer', { id, answer: 'I led the migration, um, and we shipped it' });
  assert.equal(h1.body.done, false); assert.ok(h1.body.next.question); assert.equal(h1.body.eval.fillers, 1);
  const h2 = await call(I + '/hr/answer', { id, answer: 'Another example' });
  assert.equal(h2.body.done, true);

  const rep = await call(I + '/report/' + id);
  assert.equal(rep.status, 200);
  const topics = rep.body.topics.map((t) => t.topic);
  assert.ok(topics.includes('Coding') && topics.includes('HR'));
  assert.equal(rep.body.turns.length, 3 + 1 + 2);
  assert.ok(rep.body.overall > 0 && rep.body.overall <= 10);
  assert.equal(rep.body.metrics.fillers, 7); // 3 tech answers x (um + basically) + 1 HR answer with one um
  assert.equal(rep.body.endLevel, 1); assert.equal(rep.body.startLevel, 0);
});

test('logged-in interview is saved to the dashboard and stays private', async () => {
  const ck = (await call('/api/auth/signup', { name: 'Sam', email: 'sam@example.com', password: 'password123' })).cookie;
  const s = await call(I + '/start', { role: 'ai', level: 0 }, ck);
  for (let i = 0; i < 3; i++) await call(I + '/answer', { id: s.body.id, answer: 'my answer' }, ck);
  const rep = await call(I + '/report/' + s.body.id, null, ck);
  await call(I + '/report/' + s.body.id, null, ck); // second fetch must not save twice
  const d = await call('/api/dashboard', null, ck);
  assert.equal(d.body.stats.total, 1); assert.equal(d.body.recent[0].overall, rep.body.overall); assert.equal(d.body.recent[0].role, 'ai');
  const id = d.body.recent[0].id;
  const past = await call('/api/dashboard/interviews/' + id, null, ck);
  assert.equal(past.status, 200); assert.equal(past.body.answers.length, 3); assert.equal(past.body.answers[0].answer, 'my answer'); assert.equal(past.body.answers[0].feedback, 'Good.');
  const other = (await call('/api/auth/signup', { name: 'Eve', email: 'eve@example.com', password: 'password123' })).cookie;
  assert.equal((await call('/api/dashboard/interviews/' + id, null, other)).status, 404);
  const guest = await call(I + '/start', { role: 'ai', level: 0 });
  for (let i = 0; i < 3; i++) await call(I + '/answer', { id: guest.body.id, answer: 'x' });
  await call(I + '/report/' + guest.body.id);
  assert.equal((await call('/api/dashboard', null, ck)).body.stats.total, 1); // guest runs are not stored
});

test('Urdu interviews ask Gemini for Urdu text; English ones do not', async () => {
  await call(I + '/start', { role: 'mern', level: 0, lang: 'ur' });
  assert.match(lastPrompt, /Urdu/);
  await call(I + '/start', { role: 'mern', level: 0, lang: 'xx' });
  assert.doesNotMatch(lastPrompt, /Urdu/);
});

test('page URLs serve the app, so refresh and direct links work', async () => {
  for (const p of ['/interview', '/dashboard', '/login', '/signup']) {
    const r = await realFetch(root + p); assert.equal(r.status, 200); assert.match(await r.text(), /Yawaq Coding Studio/);
  }
  assert.equal((await realFetch(root + '/nothing-here')).status, 404);
});

test('an unfinished interview survives a server restart and can be continued or discarded', async () => {
  const ck = (await call('/api/auth/signup', { name: 'Ali', email: 'ali@example.com', password: 'password123' })).cookie;
  const s = await call(I + '/start', { role: 'mean', level: 1 }, ck);
  await call(I + '/answer', { id: s.body.id, answer: 'first answer' }, ck);
  const active = await call(I + '/active', null, ck);
  assert.equal(active.body.length, 1); assert.equal(active.body[0].answered, 1); assert.equal(active.body[0].phase, 'technical');
  assert.equal((await call('/api/dashboard', null, ck)).body.unfinished.length, 1);

  _resetSessions(); // the server restarts: memory is gone
  assert.equal((await call(I + '/answer', { id: s.body.id, answer: 'x' }, ck)).status, 404);
  const r = await call(I + '/resume', { id: active.body[0].id }, ck);
  assert.equal(r.status, 200); assert.equal(r.body.phase, 'technical'); assert.equal(r.body.turns.length, 1);
  assert.equal(r.body.turns[0].answer, 'first answer'); assert.ok(r.body.q.question);

  const eve = (await call('/api/auth/signup', { name: 'Eve2', email: 'eve2@example.com', password: 'password123' })).cookie;
  assert.equal((await call(I + '/resume', { id: active.body[0].id }, eve)).status, 404); // not theirs
  assert.equal((await call(I + '/active')).status, 401);

  let last; for (let i = 0; i < 2; i++) last = await call(I + '/answer', { id: r.body.id, answer: 'more' }, ck);
  assert.equal(last.body.done, true);
  const c = await call(I + '/coding/start', { id: r.body.id }, ck); assert.equal(c.status, 200);
  assert.equal((await call(I + '/active', null, ck)).body[0].phase, 'coding');
  await call(I + '/report/' + r.body.id, null, ck);
  assert.equal((await call(I + '/active', null, ck)).body.length, 0); // finished interviews are not "unfinished"
  assert.equal((await call('/api/dashboard', null, ck)).body.stats.total, 1);

  const s2 = await call(I + '/start', { role: 'ai', level: 0 }, ck); assert.equal((await call(I + '/active', null, ck)).body.length, 1);
  await call(I + '/discard', { id: (await call(I + '/active', null, ck)).body[0].id }, ck);
  assert.equal((await call(I + '/active', null, ck)).body.length, 0); assert.ok(s2.body.id);
});
