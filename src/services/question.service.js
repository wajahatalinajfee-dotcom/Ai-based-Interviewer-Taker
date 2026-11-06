import { ROLES, TYPES, FLAVORS } from '../config/roles.js';
import { pick, similar } from '../utils/text.js';
import { gem } from './gemini.service.js';
import { questionPrompt, followUpPrompt } from '../prompts/index.js';
import { recentHistory, addHistory } from './session.store.js';
import { AppError } from '../utils/AppError.js';

// The server picks topic, type and flavor so questions differ every time.
function chooseSlot(s) {
  const pool = ROLES[s.role].topics[s.level];
  const weak = pool.filter((t) => s.topicScores[t] && s.topicScores[t].avg < 6);
  const topic = weak.length && Math.random() < 0.5 ? pick(weak) : pick(pool);
  return { topic, type: pick(TYPES), flavor: pick(FLAVORS) };
}

export async function nextQuestion(s) {
  for (let i = 0; i < 3; i++) {
    const slot = chooseSlot(s);
    const q = await gem(questionPrompt(s, slot, recentHistory()), 0.9);
    if (!q.question) continue;
    const dup = [...s.asked, ...recentHistory(60)].some((h) => similar(h, q.question));
    if (dup && i < 2) continue;
    s.asked.push(q.question);
    addHistory(q.question);
    s.current = { ...q, topic: slot.topic, type: slot.type };
    return { question: q.question, code: q.code || null, topic: slot.topic, type: slot.type };
  }
  throw new AppError('Could not generate a fresh question. Try again.', 502);
}

// A short probing question about a rubric point the candidate missed. Max depth is set by MAX_FOLLOWUPS.
export async function followUpQuestion(s, answer, point) {
  const parent = s.current;
  const q = await gem(followUpPrompt(s, parent, answer, point), 0.7);
  if (!q.question) throw new AppError('Could not generate a follow-up question. Try again.', 502);
  s.asked.push(q.question);
  const rubric = Array.isArray(q.rubric) && q.rubric.length ? q.rubric.slice(0, 3) : [point];
  s.current = { question: q.question, code: null, rubric, topic: parent.topic, type: 'follow-up', followUp: true, depth: (parent.depth || 0) + 1 };
  return { question: q.question, code: null, topic: parent.topic, type: 'follow-up', followUp: true };
}
