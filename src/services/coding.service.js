import { FLAVORS } from '../config/roles.js';
import { pick } from '../utils/text.js';
import { gem } from './gemini.service.js';
import { codingProblemPrompt, codingReviewPrompt } from '../prompts/index.js';
import { recentCoding, addCoding } from './session.store.js';
import { clamp10 } from './level.service.js';
import { recordTurn } from './turn.service.js';
import { AppError } from '../utils/AppError.js';

export async function startCoding(s) {
  const past = [...(s.codingTitles || []), ...recentCoding()];
  const p = await gem(codingProblemPrompt(s, pick(FLAVORS), past), 0.9);
  const ok = p && p.title && /^[A-Za-z_$][\w$]*$/.test(p.functionName || '') && typeof p.starterCode === 'string'
    && Array.isArray(p.tests) && p.tests.length >= 3 && p.tests.every((t) => Array.isArray(t.args));
  if (!ok) throw new AppError('Could not prepare a coding problem. Try again.', 502);
  (s.codingTitles ||= []).push(p.title);
  addCoding(p.title);
  s.coding = p;
  return { title: p.title, description: p.description, functionName: p.functionName, starterCode: p.starterCode, tests: p.tests, hint: p.hint };
}

export async function submitCoding(s, { approach, code, results }) {
  if (!s.coding) throw new AppError('Start the coding round first.', 409);
  const passed = results.filter((r) => r.pass).length;
  const failures = results.filter((r) => !r.pass).slice(0, 3);
  const rv = await gem(codingReviewPrompt(s, s.coding, { approach, code, passed, total: results.length, failures }), 0.2);
  const [c, e, r, m] = [rv.correctness, rv.efficiency, rv.readability, rv.explanation_match].map(clamp10);
  const score = Math.round((c * 0.4 + e * 0.2 + r * 0.2 + m * 0.2) * 10) / 10;
  await recordTurn(s, 'coding', { question: s.coding.title, code, topic: 'Coding', level: s.level, score, answer: approach, feedback: rv.feedback, tip: rv.tip, better: rv.optimized_code || '' });
  const t = (s.topicScores.Coding ||= { sum: 0, n: 0, avg: 0 });
  t.sum += score; t.n++; t.avg = t.sum / t.n;
  return { score, correctness: c, efficiency: e, readability: r, explanation_match: m, passed, total: results.length,
    issues: rv.issues || [], feedback: rv.feedback, tip: rv.tip, optimized_code: rv.optimized_code || '' };
}
