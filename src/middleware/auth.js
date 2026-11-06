import { readToken } from '../services/auth.service.js';
import { repo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';

// Optional: sets req.userId when a valid login cookie is present.
export const attachUser = (req, _res, next) => {
  const m = (req.headers.cookie || '').match(/(?:^|; )token=([^;]+)/);
  req.userId = m ? readToken(m[1]) : null;
  next();
};
export const requireAuth = (req, _res, next) => (req.userId ? next() : next(new AppError('Please log in.', 401)));
export const currentUser = async (req) => (req.userId ? repo.findUserById(req.userId) : null);
