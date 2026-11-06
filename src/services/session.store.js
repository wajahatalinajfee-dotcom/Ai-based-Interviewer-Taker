// In-memory store. Replace this file with a database later; nothing else changes.
const sessions = new Map();
const history = []; // recent question texts across sessions (server lifetime)

export const createSession = (data) => {
  const id = Math.random().toString(36).slice(2);
  const s = { id, ...data, asked: [], turns: [], recent: [], topicScores: {}, current: null };
  sessions.set(id, s);
  return s;
};
export const getSession = (id) => sessions.get(id);
export const recentHistory = (n = 30) => history.slice(-n);
export const addHistory = (q) => { history.push(q); if (history.length > 60) history.shift(); };

const codingHistory = [];
export const recentCoding = () => codingHistory.slice(-20);
export const addCoding = (title) => { codingHistory.push(title); if (codingHistory.length > 40) codingHistory.shift(); };

import { countFillers, countWords } from '../utils/text.js';
export const trackSpeech = (s, answer) => {
  s.metrics ||= { fillers: 0, words: 0 };
  s.metrics.fillers += countFillers(answer);
  s.metrics.words += countWords(answer);
};

// Puts a saved session back in memory (after a restart or from another device).
export const restoreSession = (s) => { const live = sessions.get(s.id); if (live) return live; sessions.set(s.id, s); return s; };
export const _resetSessions = () => sessions.clear(); // used by tests to simulate a server restart
