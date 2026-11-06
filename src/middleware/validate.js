import { ROLES } from '../config/roles.js';
import { AppError } from '../utils/AppError.js';

export function validateStart(req, _res, next) {
  const { role, level } = req.body;
  if (!ROLES[role] || !Number.isInteger(level) || level < 0 || level > 3) throw new AppError('Choose a track and level.', 400);
  req.body.lang = req.body.lang === 'ur' ? 'ur' : 'en';
  req.body.jd = String(req.body.jd || '').replace(/[<>]/g, ' ').slice(0, 2000).trim();
  next();
}

export function validateAnswer(req, _res, next) {
  if (typeof req.body.id !== 'string') throw new AppError('Missing session id.', 400);
  req.body.answer = String(req.body.answer || '').slice(0, 3000).trim();
  next();
}

export function validateCoding(req, _res, next) {
  const b = req.body;
  if (typeof b.id !== 'string' || !Array.isArray(b.results) || !b.results.length) throw new AppError('Run your code first.', 400);
  b.approach = String(b.approach || '').slice(0, 3000).trim();
  b.code = String(b.code || '').slice(0, 6000);
  const s = (v) => String(v ?? '').slice(0, 150);
  b.results = b.results.slice(0, 10).map((r) => ({ pass: !!r.pass, args: s(r.args), got: s(r.got), expected: s(r.expected), error: s(r.error) }));
  next();
}
