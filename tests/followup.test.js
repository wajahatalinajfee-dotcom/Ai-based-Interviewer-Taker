import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDb, useTestDb } from './helpers/db.js';
import { installGeminiMock, cfg } from './helpers/gemini-mock.js';

useTestDb(); process.env.JWT_SECRET = 'test'; process.env.GEMINI_API_KEY = 'test'; process.env.QUESTIONS = '5';
const realFetch = installGeminiMock();
await resetTestDb();
const { env } = await import('../src/config/env.js');
const { default: app } = await import('../src/app.js');
await (await import('../src/repositories/index.js')).repo.init();
const server = app.listen(0); await new Promise((r) => server.once('listening', r));
const root = `http://localhost:${server.address().port}`;
after(() => server.close());
const call = async (path, body) => (async (r) => ({ status: r.status, body: await r.json() }))(await realFetch(root + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }));
const I = '/api/interview';

test('missed key points trigger follow-ups (at most 2), then the interview moves on; follow-ups use up the fixed question total', async () => {
  cfg.rubric = ['closures capture variables', 'garbage collection pressure']; cfg.accuracy = 6;
  const s = await call(I + '/start', { role: 'basics', level: 1 }); const id = s.body.id;

  let r = await call(I + '/answer', { id, answer: 'I like pizza' });
  assert.equal(r.body.wasFollowUp, false); assert.equal(r.body.done, false);
  assert.equal(r.body.next.followUp, true); assert.equal(r.body.next.type, 'follow-up');
  assert.equal(r.body.eval.nlp.coverage.length, 2); assert.ok(r.body.eval.score < 8);
  assert.equal(r.body.eval.nlp.source, 'js-fallback');

  r = await call(I + '/answer', { id, answer: 'still pizza' });
  assert.equal(r.body.wasFollowUp, true); assert.equal(r.body.next.followUp, true); // second and last follow-up

  r = await call(I + '/answer', { id, answer: 'pizza again' });
  assert.equal(r.body.wasFollowUp, true); assert.notEqual(r.body.next.followUp, true); // depth limit reached: next main question

  cfg.accuracy = 9;
  r = await call(I + '/answer', { id, answer: 'Closures capture variables, and they add garbage collection pressure.' });
  assert.equal(r.body.eval.nlp.coverage.every((c) => c.covered), true);
  assert.equal(r.body.eval.score, 9.3); // 0.75 x 9 (AI) + 0.25 x 10 (all key points covered), rounded
  assert.notEqual(r.body.next.followUp, true); assert.equal(r.body.done, false);

  r = await call(I + '/answer', { id, answer: 'Closures capture variables, and they add garbage collection pressure.' });
  assert.equal(r.body.done, true); // 5 answers = the fixed total: 3 main questions + 2 follow-ups

  const rep = await call(I + '/report/' + id);
  assert.equal(rep.body.turns.length, 5); assert.equal(rep.body.answers.filter((a) => a.followUp).length, 2);
});

test('an empty answer never triggers a follow-up and scores 1', async () => {
  cfg.accuracy = 9;
  const s = await call(I + '/start', { role: 'basics', level: 1 });
  const r = await call(I + '/answer', { id: s.body.id, answer: '' });
  assert.equal(r.body.eval.score, 1); assert.notEqual(r.body.next.followUp, true);
});

test('the question total is fixed at the start by level and never exceeded, even when answers keep missing key points', async () => {
  cfg.rubric = ['closures capture variables', 'garbage collection pressure']; cfg.accuracy = 6;
  const saved = env.questionsByLevel; env.questionsByLevel = [2, 3, 4, 5];
  try {
    const a = await call(I + '/start', { role: 'basics', level: 0 }); assert.equal(a.body.total, 2);
    let r = await call(I + '/answer', { id: a.body.id, answer: 'pizza' }); assert.equal(r.body.done, false); assert.equal(r.body.next.followUp, true);
    r = await call(I + '/answer', { id: a.body.id, answer: 'pizza' }); // 2nd answer = the total: finished, no more follow-ups
    assert.equal(r.body.done, true); assert.equal(r.body.next, undefined);

    const b = await call(I + '/start', { role: 'basics', level: 3 }); assert.equal(b.body.total, 5);
    let n = 0, last; do { last = await call(I + '/answer', { id: b.body.id, answer: 'pizza' }); n++; } while (!last.body.done && n < 20);
    assert.equal(n, 5); // exactly 5 questions asked, follow-ups included
  } finally { env.questionsByLevel = saved; }
});
