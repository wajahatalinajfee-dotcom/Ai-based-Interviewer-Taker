import pg from 'pg';
import { env } from '../config/env.js';

// This app's tables are prefixed yawaq_ so they never clash with other tables in the same database.
// 'require' is rewritten to 'verify-full' (what pg already does) to silence the SSL mode warning.
const pool = new pg.Pool({ connectionString: env.databaseUrl.replace(/sslmode=(require|prefer|verify-ca)/, 'sslmode=verify-full'), max: 5 });
const toTurn = (r) => ({ idx: r.idx, round: r.round, topic: r.topic, level: r.level, question: r.question, code: r.code, answer: r.answer, score: r.score == null ? null : Number(r.score), feedback: r.feedback, tip: r.tip, better: r.better, followUp: r.follow_up, nlp: r.nlp });
const toInterview = (r) => ({ id: r.id, role: r.role, lang: r.lang, status: r.status, startLevel: r.start_level, endLevel: r.end_level, overall: r.overall == null ? null : Number(r.overall), createdAt: r.created_at, report: r.report });

export async function init() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS yawaq_users (id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS yawaq_interviews (id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES yawaq_users(id) ON DELETE CASCADE, role TEXT NOT NULL,
      start_level INT NOT NULL, end_level INT, overall NUMERIC(3,1), report JSONB, created_at TIMESTAMPTZ DEFAULT now());
    ALTER TABLE yawaq_interviews ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'completed';
    ALTER TABLE yawaq_interviews ADD COLUMN IF NOT EXISTS lang TEXT NOT NULL DEFAULT 'en';
    ALTER TABLE yawaq_interviews ADD COLUMN IF NOT EXISTS state JSONB;
    ALTER TABLE yawaq_interviews ALTER COLUMN end_level DROP NOT NULL;
    ALTER TABLE yawaq_interviews ALTER COLUMN overall DROP NOT NULL;
    ALTER TABLE yawaq_interviews ALTER COLUMN report DROP NOT NULL;
    CREATE INDEX IF NOT EXISTS yawaq_interviews_user_idx ON yawaq_interviews (user_id, created_at DESC);
    CREATE TABLE IF NOT EXISTS yawaq_interview_turns (id SERIAL PRIMARY KEY, interview_id INT NOT NULL REFERENCES yawaq_interviews(id) ON DELETE CASCADE, idx INT NOT NULL,
      round TEXT NOT NULL, topic TEXT, level INT, question TEXT NOT NULL, code TEXT, answer TEXT, score NUMERIC(3,1), feedback TEXT, tip TEXT, better TEXT, created_at TIMESTAMPTZ DEFAULT now());
    CREATE INDEX IF NOT EXISTS yawaq_turns_interview_idx ON yawaq_interview_turns (interview_id, idx);
    ALTER TABLE yawaq_interview_turns ADD COLUMN IF NOT EXISTS follow_up BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE yawaq_interview_turns ADD COLUMN IF NOT EXISTS nlp JSONB;`);
  console.log('Connected to PostgreSQL');
}
export const createUser = async ({ name, email, passwordHash }) =>
  (await pool.query('INSERT INTO yawaq_users (name, email, password_hash) VALUES ($1,$2,$3) RETURNING id, name, email', [name, email, passwordHash])).rows[0];
export const findUserByEmail = async (email) => (await pool.query('SELECT * FROM yawaq_users WHERE email=$1', [email])).rows[0];
export const findUserById = async (id) => (await pool.query('SELECT id, name, email FROM yawaq_users WHERE id=$1', [id])).rows[0];

export const createInterview = async ({ userId, role, startLevel, lang }) =>
  (await pool.query("INSERT INTO yawaq_interviews (user_id, role, start_level, lang, status) VALUES ($1,$2,$3,$4,'active') RETURNING id", [userId, role, startLevel, lang])).rows[0].id;
export const addTurn = async (interviewId, t) =>
  pool.query(`INSERT INTO yawaq_interview_turns (interview_id, idx, round, topic, level, question, code, answer, score, feedback, tip, better, follow_up, nlp)
    SELECT $1::int, COALESCE(MAX(idx),0)+1, $2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13 FROM yawaq_interview_turns WHERE interview_id=$1`,
    [interviewId, t.round, t.topic, t.level, t.question, t.code || null, t.answer || '', t.score, t.feedback || null, t.tip || null, t.better || null, !!t.followUp, t.nlp || null]);
export const finishInterview = async (id, { endLevel, overall, report }) =>
  pool.query("UPDATE yawaq_interviews SET end_level=$2, overall=$3, report=$4, status='completed' WHERE id=$1", [id, endLevel, overall, report]);
export const listInterviews = async (userId, limit = 50) =>
  (await pool.query("SELECT * FROM yawaq_interviews WHERE user_id=$1 AND status='completed' AND report IS NOT NULL ORDER BY created_at DESC LIMIT $2", [userId, limit])).rows.map(toInterview);
export const getInterview = async (userId, id) => {
  const r = (await pool.query('SELECT * FROM yawaq_interviews WHERE user_id=$1 AND id=$2', [userId, id])).rows[0];
  if (!r) return null;
  const turns = (await pool.query('SELECT * FROM yawaq_interview_turns WHERE interview_id=$1 ORDER BY idx', [id])).rows.map(toTurn);
  return { ...toInterview(r), turns };
};

// Progress snapshot so an unfinished interview can be continued later.
export const saveState = (id, state) => pool.query('UPDATE yawaq_interviews SET state=$2 WHERE id=$1', [id, state]);
export const getInterviewState = async (userId, id) =>
  (await pool.query("SELECT id, state FROM yawaq_interviews WHERE user_id=$1 AND id=$2 AND status='active' AND state IS NOT NULL", [userId, id])).rows[0];
export const listActive = async (userId) =>
  (await pool.query(`SELECT id, role, lang, created_at, state->>'phase' AS phase, jsonb_array_length(state->'turns') AS answered
    FROM yawaq_interviews WHERE user_id=$1 AND status='active' AND state IS NOT NULL ORDER BY created_at DESC LIMIT 5`, [userId]))
    .rows.map((r) => ({ id: r.id, role: r.role, lang: r.lang, createdAt: r.created_at, phase: r.phase, answered: r.answered }));
export const setStatus = (userId, id, status) => pool.query("UPDATE yawaq_interviews SET status=$3 WHERE user_id=$1 AND id=$2 AND status='active'", [userId, id, status]);
