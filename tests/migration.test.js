import test from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';

const url = process.env.TEST_DATABASE_URL;
test('works in a database that already has another app\'s users table (uuid ids) and leaves it alone', { skip: !url && 'set TEST_DATABASE_URL to run' }, async () => {
  process.env.DATABASE_URL = url;
  const pool = new pg.Pool({ connectionString: url });
  await pool.query('DROP TABLE IF EXISTS yawaq_interview_turns, yawaq_interviews, yawaq_users, users CASCADE');
  await pool.query("CREATE TABLE users (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name TEXT); INSERT INTO users (name) VALUES ('someone else')");
  const repo = await import('../src/repositories/pg.repository.js');
  await repo.init(); await repo.init(); // must not fail, and must be safe on every start
  const u = await repo.createUser({ name: 'Ayesha', email: 'a@x.com', passwordHash: 'h' });
  const id = await repo.createInterview({ userId: u.id, role: 'ai', startLevel: 0, lang: 'ur' });
  await repo.addTurn(id, { round: 'technical', topic: 'tokens', level: 0, question: 'سوال؟', answer: 'جواب', score: 7.5, feedback: 'ٹھیک' });
  await repo.saveState(id, { phase: 'technical', turns: [{}] });
  assert.equal((await repo.listActive(u.id))[0].answered, 1);
  const got = await repo.getInterview(u.id, id);
  assert.equal(got.turns[0].question, 'سوال؟'); assert.equal(got.turns[0].score, 7.5);
  const other = (await pool.query('SELECT name FROM users')).rows;
  assert.deepEqual(other, [{ name: 'someone else' }]); // the other app's table is untouched
  await pool.query('DROP TABLE users');
  await pool.end();
});
