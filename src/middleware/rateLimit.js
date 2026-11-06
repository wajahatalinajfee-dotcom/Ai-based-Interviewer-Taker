import { AppError } from '../utils/AppError.js';

// Small in-memory limiter for login/signup: 20 attempts per 15 minutes per IP.
const hits = new Map();
export const authLimiter = (req, _res, next) => {
  const now = Date.now(), key = req.ip;
  const list = (hits.get(key) || []).filter((t) => now - t < 15 * 60 * 1000);
  list.push(now); hits.set(key, list);
  next(list.length > 20 ? new AppError('Too many attempts. Try again in a few minutes.', 429) : undefined);
};
