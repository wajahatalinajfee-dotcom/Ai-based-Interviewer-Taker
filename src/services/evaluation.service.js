import { gem } from './gemini.service.js';
import { evaluationPrompt } from '../prompts/index.js';
import { clamp10, overallScore, applyLevelRules } from './level.service.js';
import { analyze } from './nlp.service.js';
import { trackSpeech } from './session.store.js';
import { recordTurn } from './turn.service.js';
import { env } from '../config/env.js';

const r1 = (n) => Math.round(n * 10) / 10;

export async function evaluateAnswer(s, answer) {
  const c = s.current;
  // The LLM judges quality; the NLP service measures rubric coverage, fillers and hedging. Both run at once.
  const [ev, nlp] = await Promise.all([
    gem(evaluationPrompt(s, c, answer), 0.2),
    analyze({ text: answer, lang: s.lang, rubric: c.rubric || [] }),
  ]);
  const llmScore = overallScore(ev);
  const nlpScore = answer && nlp.nlp_score != null ? nlp.nlp_score : null;
  const score = !answer ? 1 : nlpScore == null ? llmScore : Math.max(1, r1(env.scoreMixLlm * llmScore + (1 - env.scoreMixLlm) * nlpScore));
  const coverage = (nlp.coverage || []).map(({ point, score: sc, covered }) => ({ point, score: sc, covered }));
  const missed = coverage.filter((x) => !x.covered).map((x) => x.point);
  const summary = { source: nlp.source, llm_score: llmScore, nlp_score: nlpScore, coverage, words: nlp.words, fillers: nlp.fillers?.count || 0,
    hedges: nlp.hedges?.count || 0, terms: nlp.terms || [], semantic_used: !!nlp.semantic_used };
  const isFollowUp = !!c.followUp;

  await recordTurn(s, 'technical', { question: c.question, code: c.code, topic: c.topic, level: s.level, score, answer, followUp: isFollowUp,
    feedback: ev.feedback, better: ev.better_answer, tip: ev.tip, nlp: summary });
  const t = (s.topicScores[c.topic] ||= { sum: 0, n: 0, avg: 0 });
  t.sum += score; t.n++; t.avg = t.sum / t.n;
  trackSpeech(s, answer);

  // Follow-ups are scored and saved, but only main questions count towards the level and the question total.
  s.techAnswered = (s.techAnswered || 0) + 1; // every answer, follow-ups included, uses one question from the fixed total
  let levelChanged = 0;
  if (!isFollowUp) { s.recent.push(score); levelChanged = applyLevelRules(s); }
  const done = s.techAnswered >= (s.totalQuestions || env.totalQuestions);
  const wantsFollowUp = !done && !!answer && (c.depth || 0) < env.maxFollowUps && missed.length > 0 && score < 8;
  return {
    eval: { score, accuracy: clamp10(ev.accuracy), depth: clamp10(ev.depth), clarity: clamp10(ev.clarity), missed: ev.missed || [],
      feedback: ev.feedback, better_answer: ev.better_answer, tip: ev.tip, evidence: ev.evidence || '', nlp: summary },
    level: s.level, levelChanged, wasFollowUp: isFollowUp, wantsFollowUp, missedPoint: missed[0],
    done,
  };
}
