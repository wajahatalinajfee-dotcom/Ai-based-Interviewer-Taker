import { repo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';

const r1 = (n) => Math.round(n * 10) / 10;

export async function getDashboard(userId) {
  const list = await repo.listInterviews(userId, 50); // newest first
  const total = list.length;
  const sums = {};
  list.forEach((i) => (i.report.topics || []).forEach((t) => { (sums[t.topic] ||= []).push(t.avg); }));
  return {
    stats: { total, avg: total ? r1(list.reduce((a, i) => a + i.overall, 0) / total) : 0, best: total ? Math.max(...list.map((i) => i.overall)) : 0, level: total ? list[0].endLevel : null },
    trend: [...list].reverse().slice(-12).map((i) => ({ date: i.createdAt, overall: i.overall })),
    topics: Object.entries(sums).map(([topic, v]) => ({ topic, avg: r1(v.reduce((a, b) => a + b, 0) / v.length) })).sort((a, b) => b.avg - a.avg),
    unfinished: await repo.listActive(userId),
    recent: list.slice(0, 10).map(({ id, role, overall, startLevel, endLevel, createdAt }) => ({ id, role, overall, startLevel, endLevel, createdAt })),
  };
}

export async function getPastInterview(userId, id) {
  const i = await repo.getInterview(userId, id);
  if (!i) throw new AppError('Interview not found.', 404);
  return { ...i.report, answers: i.turns && i.turns.length ? i.turns : i.report.answers || [] };
}
