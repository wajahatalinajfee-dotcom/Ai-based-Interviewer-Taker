import { repo } from '../repositories/index.js';

// Keeps the turn in the live session and saves it to the database right away (logged-in users).
export async function recordTurn(s, round, t) {
  const turn = { round, ...t };
  s.turns.push(turn);
  if (s.dbId) {
    try { await repo.addTurn(s.dbId, turn); } catch (e) { console.error('Could not save turn to the database:', e.message); }
  }
}
