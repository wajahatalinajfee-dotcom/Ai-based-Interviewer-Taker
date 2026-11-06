import 'dotenv/config';

import crypto from 'node:crypto';

export const env = {
  databaseUrl: process.env.DATABASE_URL || '',
  isProd: process.env.NODE_ENV === 'production',
  jwtSecret: process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex'), // random per run if unset: logins reset on restart
  port: Number(process.env.PORT || 3000),
  geminiKey: process.env.GEMINI_API_KEY,
  nlpUrl: process.env.NLP_URL ?? 'http://127.0.0.1:8001', // empty string turns the Python service off
  scoreMixLlm: Number(process.env.SCORE_MIX_LLM || 0.75), // share of the score from the LLM; the rest is NLP rubric coverage
  maxFollowUps: Number(process.env.MAX_FOLLOWUPS || 2),
  geminiTtsModel: process.env.GEMINI_TTS_MODEL || 'gemini-2.5-flash-preview-tts',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  hrQuestions: Number(process.env.HR_QUESTIONS || 3),
  totalQuestions: Number(process.env.QUESTIONS || 6),
  // Questions asked in the technical round, fixed when the interview starts, by starting level (L1..L4).
  // Follow-up questions count inside this number. Unset levels use QUESTIONS.
  questionsByLevel: [1, 2, 3, 4].map((n) => Number(process.env[`QUESTIONS_L${n}`] || process.env.QUESTIONS || 6)),
};
