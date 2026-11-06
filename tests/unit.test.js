import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { similar, countFillers } from '../src/utils/text.js';
import { applyLevelRules, hrScore, overallScore, clamp10 } from '../src/services/level.service.js';
import { validateStart, validateCoding } from '../src/middleware/validate.js';
import { evaluationPrompt, questionPrompt, reportPrompt, followUpPrompt, SYSTEM_PROMPT } from '../src/prompts/index.js';

test('similar flags near-duplicate questions only', () => {
  assert.ok(similar('Explain how closures capture variables in JavaScript', 'Explain how closures capture variables in JavaScript functions'));
  assert.ok(!similar('Explain closures in JavaScript', 'Describe database indexing strategies for MongoDB collections'));
});

test('countFillers counts fillers, not normal words', () => {
  assert.equal(countFillers('Um, so basically I think, you know, it works'), 3);
  assert.equal(countFillers('I would use a hash map'), 0);
});

test('clamp10 and overallScore stay in range', () => {
  assert.equal(clamp10(99), 10); assert.equal(clamp10(-4), 1); assert.equal(clamp10('x'), 1);
  assert.equal(overallScore({ accuracy: 10, depth: 10, clarity: 10 }), 10);
  assert.equal(overallScore({ accuracy: 4, depth: 4, clarity: 4 }), 4);
});

test('level goes up on 3 strong answers and resets the window', () => {
  const s = { level: 0, recent: [9, 8, 9] };
  assert.equal(applyLevelRules(s), 1); assert.equal(s.level, 1); assert.deepEqual(s.recent, []);
});

test('level goes down on 3 weak answers but never below L1 or above L4', () => {
  assert.equal(applyLevelRules({ level: 2, recent: [2, 3, 4] }), -1);
  assert.equal(applyLevelRules({ level: 0, recent: [1, 1, 1] }), 0);
  assert.equal(applyLevelRules({ level: 3, recent: [10, 10, 10] }), 0);
  assert.equal(applyLevelRules({ level: 1, recent: [9, 9] }), 0);
});

test('hrScore caps structure when STAR coverage is weak', () => {
  const weak = hrScore({ star: { situation: true }, structure: 9, ownership: 9, clarity: 9 });
  assert.equal(weak.structure, 5);
  const strong = hrScore({ star: { situation: true, task: true, action: true, result: true }, structure: 9, ownership: 8, clarity: 8 });
  assert.equal(strong.structure, 9); assert.equal(strong.covered, 4);
});

test('validateStart rejects bad role or level', () => {
  const run = (body) => { try { validateStart({ body }, {}, () => {}); return 'ok'; } catch (e) { return e.status; } };
  assert.equal(run({ role: 'mern', level: 2 }), 'ok');
  assert.equal(run({ role: 'cobol', level: 2 }), 400);
  assert.equal(run({ role: 'mern', level: 7 }), 400);
  assert.equal(run({ role: 'mern', level: '1' }), 400);
});

test('validateCoding trims input and requires results', () => {
  const body = { id: 'a', code: 'x'.repeat(9000), results: Array.from({ length: 20 }, () => ({ pass: 1 })) };
  validateCoding({ body }, {}, () => {});
  assert.equal(body.code.length, 6000); assert.equal(body.results.length, 10);
  assert.throws(() => validateCoding({ body: { id: 'a', results: [] } }, {}, () => {}));
});

test('browser test-runner worker logic passes and fails correctly', () => {
  const ctx = { self: {} }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../public/js/coding.js', import.meta.url), 'utf8'), ctx);
  const run = (code, tests, name = 'add') => { let out; ctx.self.postMessage = (r) => (out = r); vm.runInContext('workerBody()', ctx); ctx.self.onmessage({ data: { code, name, tests } }); return out; };
  const tests = [{ args: [1, 2], expected: 3 }, { args: [2, 2], expected: 5 }];
  const r = run('function add(a,b){return a+b}', tests);
  assert.equal(JSON.stringify(r.map((x) => x.pass)), '[true,false]'); // JSON: vm arrays have a different prototype
  assert.match(run('function add(', tests)[0].error, /SyntaxError/);
  assert.match(run('function sub(){}', tests)[0].error, /not found/);
  assert.match(run('function add(){throw new Error("boom")}', tests)[0].error, /boom/);
});

test('review panel shows only the selected question; the left list shows topics only', () => {
  const els = {}, $ = (id) => (els[id] ||= { innerHTML: '' });
  const ctx = { $, esc: (t) => String(t ?? ''), cls: () => 'hi', plannedTotal: 0 }; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(new URL('../public/js/turns.js', import.meta.url), 'utf8'), ctx);
  ctx.resetTurns(3);
  assert.equal((els.prog.innerHTML.match(/<button/g) || []).length, 3); // 3 numbered dots from the start
  const a = ctx.openTurn('if else', 'Question one text', null); ctx.finishTurn(a, { answer: 'ANSWER ONE', score: 8, feedback: 'F1' });
  const b = ctx.openTurn('loops', 'Question two text', null); ctx.finishTurn(b, { answer: 'ANSWER TWO', score: 6, feedback: 'F2' });
  assert.match(els.rows.innerHTML, /ANSWER TWO/); assert.doesNotMatch(els.rows.innerHTML, /ANSWER ONE/);
  ctx.selectTurn(0);
  assert.match(els.rows.innerHTML, /ANSWER ONE/); assert.doesNotMatch(els.rows.innerHTML, /ANSWER TWO/);
  assert.match(els.qlist.innerHTML, /If else/); assert.doesNotMatch(els.qlist.innerHTML, /Question one text/);
});

test('browser scripts do not redefine each other\'s global names', () => {
  const dir = new URL('../public/js/', import.meta.url), seen = {}, dupes = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.js'))) {
    const src = fs.readFileSync(new URL(f, dir), 'utf8');
    const names = [...src.matchAll(/^(?:async )?function (\w+)/gm)].map((m) => m[1])
      .concat([...src.matchAll(/^(?:const|let) ([^=;\n]+?)(?: =|;|$)/gm)].flatMap((m) => m[1].split(',').map((n) => n.trim().split(/\s/)[0])));
    for (const n of names.filter(Boolean)) { if (seen[n] && seen[n] !== f) dupes.push(`${n} (${seen[n]} and ${f})`); seen[n] = f; }
  }
  assert.deepEqual(dupes, []);
});

test('prompts include scoring anchors, evidence, job description handling, follow-ups and a hiring recommendation', () => {
  const s = { role: 'mern', level: 2, lang: 'en', asked: [], jd: 'Build React dashboards', startLevel: 0 };
  const ev = evaluationPrompt(s, { question: 'q', rubric: ['r'] }, 'a');
  assert.match(ev, /Scoring anchors/); assert.match(ev, /"evidence"/);
  const slot = { topic: 't', type: 'concept', flavor: 'f' };
  assert.match(questionPrompt(s, slot, []), /<jd>Build React dashboards<\/jd>/);
  assert.doesNotMatch(questionPrompt({ ...s, jd: '' }, slot, []), /<jd>/);
  assert.match(reportPrompt(s, [], 7), /recommendation/); assert.match(SYSTEM_PROMPT, /<jd>/);
  assert.match(followUpPrompt(s, { question: 'Q1' }, 'ans', 'the missed point'), /the missed point/);
  assert.match(followUpPrompt({ ...s, lang: 'ur' }, { question: 'Q1' }, 'ans', 'p'), /Urdu/);
});

test('job description input is cleaned and limited', () => {
  const body = { role: 'mern', level: 1, jd: '<script>x</script>' + 'a'.repeat(3000) };
  validateStart({ body }, {}, () => {});
  assert.ok(!/[<>]/.test(body.jd)); assert.ok(body.jd.length <= 2000 && body.jd.length > 1900);
});
