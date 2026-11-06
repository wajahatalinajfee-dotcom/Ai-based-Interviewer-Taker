import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { useTestDb } from './helpers/db.js';

useTestDb();
const { jsAnalyze, analyze, _resetNlpState } = await import('../src/services/nlp.service.js');
const { env } = await import('../src/config/env.js');
const RUBRIC = ['closures capture variables from the outer scope', 'can cause memory leaks if references are kept'];

test('fallback analyzer counts fillers and hedges in English, Roman Urdu and Urdu script', () => {
  const r = jsAnalyze({ text: 'Um, basically I think it works. matlab شاید یہ ٹھیک ہے', rubric: [] });
  assert.deepEqual(r.fillers.items, { um: 1, basically: 1, matlab: 1 }); assert.equal(r.fillers.count, 3);
  assert.deepEqual(r.hedges.items, { 'i think': 1, 'شاید': 1 });
  assert.equal(r.nlp_score, null); assert.equal(r.source, 'js-fallback');
});

test('fallback coverage separates a good answer from an off-topic one, and ignores unusable rubric points', () => {
  const good = jsAnalyze({ text: 'A closure captures variables from the outer scope. It can cause memory leaks when references are kept.', rubric: RUBRIC });
  assert.equal(good.nlp_score, 10); assert.ok(good.coverage.every((c) => c.covered));
  assert.equal(jsAnalyze({ text: 'I like nice fonts', rubric: RUBRIC }).nlp_score, 0);
  assert.equal(jsAnalyze({ text: 'A closure captures variables from the outer scope.', rubric: RUBRIC }).nlp_score, 5);
  assert.equal(jsAnalyze({ text: 'anything', rubric: ['a', 'b', 'the'] }).nlp_score, null);
});

test('analyze() uses the fallback when no NLP service is configured', async () => {
  env.nlpUrl = '';
  assert.equal((await analyze({ text: 'hello', lang: 'en', rubric: [] })).source, 'js-fallback');
});

let fake;
after(() => fake && fake.close());
test('analyze() uses the Python service when it is up, and falls back (and backs off) when it goes down', async () => {
  let calls = 0;
  fake = http.createServer((req, res) => { calls++; res.setHeader('content-type', 'application/json'); res.end(JSON.stringify({ source: 'python', nlp_score: 7, coverage: [] })); });
  await new Promise((r) => fake.listen(0, r));
  env.nlpUrl = `http://127.0.0.1:${fake.address().port}`; _resetNlpState();
  assert.equal((await analyze({ text: 'x', lang: 'en', rubric: [] })).source, 'python'); assert.equal(calls, 1);
  await new Promise((r) => fake.close(r));
  assert.equal((await analyze({ text: 'x', lang: 'en', rubric: [] })).source, 'js-fallback'); // service gone
  assert.equal((await analyze({ text: 'x', lang: 'en', rubric: [] })).source, 'js-fallback'); // does not retry for 30 s
});
