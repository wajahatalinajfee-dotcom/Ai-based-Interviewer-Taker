export const clamp10 = (v) => Math.min(10, Math.max(1, Math.round(Number(v) || 1)));

export const overallScore = (e) =>
  Math.round((clamp10(e.accuracy) * 0.5 + clamp10(e.depth) * 0.3 + clamp10(e.clarity) * 0.2) * 10) / 10;

// Average of the last 3 scores decides level changes. Returns +1, -1 or 0.
export function applyLevelRules(s) {
  if (s.recent.length < 3) return 0;
  const avg = s.recent.slice(-3).reduce((a, b) => a + b, 0) / 3;
  let change = 0;
  if (avg >= 8 && s.level < 3) change = 1;
  else if (avg <= 4 && s.level > 0) change = -1;
  if (change) { s.level += change; s.recent = []; }
  return change;
}

const STAR = ['situation', 'task', 'action', 'result'];
// HR score: structure 50%, ownership 30%, clarity 20%. Weak STAR coverage caps structure at 5.
export function hrScore(ev) {
  const star = ev.star || {};
  const covered = STAR.filter((k) => star[k] === true).length;
  let structure = clamp10(ev.structure);
  if (covered <= 1) structure = Math.min(structure, 5);
  const score = Math.round((structure * 0.5 + clamp10(ev.ownership) * 0.3 + clamp10(ev.clarity) * 0.2) * 10) / 10;
  return { score, structure, covered };
}
