import { gem } from './gemini.service.js';
import { reportPrompt } from '../prompts/index.js';

export async function buildReport(s) {
  const overall = Math.round((s.turns.reduce((a, t) => a + t.score, 0) / s.turns.length) * 10) / 10;
  const topics = Object.entries(s.topicScores).map(([topic, v]) => ({ topic, avg: Math.round(v.avg * 10) / 10 }));
  const turns = s.turns.map((t) => ({ topic: t.topic, level: t.level, score: t.score }));
  const ai = await gem(reportPrompt(s, turns, overall), 0.4);
  return { overall, topics, turns, answers: s.turns.map(({ round, topic, question, answer, score, feedback, tip, better, followUp }) => ({ round, topic, question, answer, score, feedback, tip, better, followUp })), metrics: s.metrics || { fillers: 0, words: 0 }, startLevel: s.startLevel, endLevel: s.level, ...ai };
}
