import { HR_TOPICS } from '../config/roles.js';
import { pick, similar, countFillers } from '../utils/text.js';
import { gem } from './gemini.service.js';
import { hrQuestionPrompt, hrEvaluationPrompt } from '../prompts/index.js';
import { recentHistory, addHistory, trackSpeech } from './session.store.js';
import { clamp10, hrScore } from './level.service.js';
import { recordTurn } from './turn.service.js';
import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

async function hrQuestion(s) {
  for (let i = 0; i < 3; i++) {
    const left = HR_TOPICS.filter((t) => !s.hr.topics.includes(t));
    const topic = pick(left.length ? left : HR_TOPICS);
    const { question } = await gem(hrQuestionPrompt(s, topic, s.hr.asked), 0.9);
    if (!question) continue;
    const dup = [...s.hr.asked, ...recentHistory(60)].some((h) => similar(h, question));
    if (dup && i < 2) continue;
    s.hr.asked.push(question); s.hr.topics.push(topic); addHistory(question);
    s.hr.current = { question, topic };
    return { question, code: null, topic, type: 'behavioral' };
  }
  throw new AppError('Could not generate an HR question. Try again.', 502);
}

export async function startHr(s) {
  s.hr = { asked: [], topics: [], n: 0, current: null };
  return { total: env.hrQuestions, q: await hrQuestion(s) };
}

export async function submitHr(s, answer) {
  if (!s.hr || !s.hr.current) throw new AppError('Start the HR round first.', 409);
  const ev = await gem(hrEvaluationPrompt(s, s.hr.current.question, answer), 0.2);
  const h = hrScore(ev);
  trackSpeech(s, answer);
  await recordTurn(s, 'hr', { question: s.hr.current.question, topic: 'HR', level: s.level, score: h.score, answer, feedback: ev.feedback, better: ev.better_answer, tip: ev.tip });
  const t = (s.topicScores.HR ||= { sum: 0, n: 0, avg: 0 });
  t.sum += h.score; t.n++; t.avg = t.sum / t.n;
  s.hr.n++;
  const done = s.hr.n >= env.hrQuestions;
  const out = { done, eval: { score: h.score, structure: h.structure, ownership: clamp10(ev.ownership), clarity: clamp10(ev.clarity),
    star: ev.star || {}, fillers: countFillers(answer), feedback: ev.feedback, better_answer: ev.better_answer, tip: ev.tip } };
  if (!done) out.next = await hrQuestion(s);
  return out;
}
