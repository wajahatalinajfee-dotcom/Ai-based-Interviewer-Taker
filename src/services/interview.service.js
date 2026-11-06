import { createSession, getSession, restoreSession } from './session.store.js';
import { nextQuestion, followUpQuestion } from './question.service.js';
import { evaluateAnswer } from './evaluation.service.js';
import { buildReport } from './report.service.js';
import * as hr from './hr.service.js';
import * as coding from './coding.service.js';
import { repo } from '../repositories/index.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const need = (id) => {
  const s = getSession(id);
  if (!s) throw new AppError('Session not found. Start a new interview.', 404);
  return s;
};
// Saves progress after every step so the user can continue later, even after leaving or a server restart.
const persist = async (s) => {
  if (!s.dbId) return;
  try { await repo.saveState(s.dbId, s); } catch (e) { console.error('Could not save progress:', e.message); }
};

export async function startInterview({ role, level, lang, jd, userId }) {
  const s = createSession({ role, level, lang, jd: jd || '', startLevel: level, userId: userId || null, phase: 'technical', totalQuestions: env.questionsByLevel[level] || env.totalQuestions });
  if (userId) {
    try { s.dbId = await repo.createInterview({ userId, role, startLevel: level, lang }); }
    catch (e) { console.error('Could not save interview to the database:', e.message); }
  }
  const q = await nextQuestion(s);
  await persist(s);
  return { id: s.id, level, total: s.totalQuestions, q };
}

export async function submitAnswer({ id, answer }) {
  const s = need(id);
  if (!s.current) throw new AppError('No active question.', 409);
  const out = await evaluateAnswer(s, answer);
  if (out.wantsFollowUp) out.next = await followUpQuestion(s, answer, out.missedPoint);
  else if (!out.done) out.next = await nextQuestion(s);
  if (out.done) s.phase = 'coding';
  await persist(s);
  return out;
}

export async function startCodingRound(id) {
  const s = need(id); s.phase = 'coding';
  const p = await coding.startCoding(s); await persist(s); return p;
}
export async function submitCodingRound({ id, ...body }) {
  const s = need(id);
  const out = await coding.submitCoding(s, body); s.phase = 'hr'; await persist(s); return out;
}
export async function startHrRound(id) {
  const s = need(id); s.phase = 'hr';
  const out = await hr.startHr(s); await persist(s); return out;
}
export async function submitHrRound({ id, answer }) {
  const s = need(id);
  const out = await hr.submitHr(s, answer);
  if (out.done) s.phase = 'report';
  await persist(s); return out;
}

export async function getReport(id) {
  const s = need(id);
  if (!s.turns.length) throw new AppError('Answer at least one question first.', 409);
  if (s.report) return s.report;
  s.report = await buildReport(s);
  if (s.dbId && !s.saved) {
    await repo.finishInterview(s.dbId, { endLevel: s.level, overall: s.report.overall, report: s.report });
    s.saved = true;
  }
  return s.report;
}

export const listUnfinished = (userId) => repo.listActive(userId);
export const discardInterview = async (userId, id) => { await repo.setStatus(userId, Number(id), 'abandoned'); return { ok: true }; };

// Rebuilds a saved interview and tells the browser exactly where to continue.
export async function resumeInterview(userId, dbId) {
  const row = await repo.getInterviewState(userId, Number(dbId));
  if (!row) throw new AppError('That interview is no longer available.', 404);
  const s = restoreSession({ ...row.state, dbId: row.id, userId });
  const view = (q) => q && { question: q.question, code: q.code || null, topic: q.topic, type: q.type || 'behavioral' };
  const { title, description, functionName, starterCode, tests, hint } = s.coding || {};
  return {
    id: s.id, phase: s.phase, role: s.role, lang: s.lang, level: s.level, total: s.totalQuestions || env.totalQuestions, hrTotal: env.hrQuestions,
    turns: s.turns.map(({ round, topic, question, answer, score, feedback, tip, better, followUp }) => ({ round, topic, question, answer, score, feedback, tip, better, followUp })),
    q: s.phase === 'technical' ? view(s.current) : s.phase === 'hr' && s.hr && s.hr.current ? view(s.hr.current) : null,
    problem: s.phase === 'coding' && s.coding ? { title, description, functionName, starterCode, tests, hint } : null,
  };
}
