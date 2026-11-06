import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { repo } from '../repositories/index.js';
import { AppError } from '../utils/AppError.js';

export const signToken = (user) => jwt.sign({ sub: user.id }, env.jwtSecret, { expiresIn: '7d' });
export const readToken = (t) => { try { return jwt.verify(t, env.jwtSecret).sub; } catch { return null; } };

export async function signup({ name, email, password }) {
  name = String(name || '').trim(); email = String(email || '').trim().toLowerCase(); password = String(password || '');
  if (!name || name.length > 60) throw new AppError('Enter your name (up to 60 characters).', 400);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new AppError('Enter a valid email address.', 400);
  if (password.length < 8 || password.length > 72) throw new AppError('Password must be 8 to 72 characters.', 400);
  try {
    const user = await repo.createUser({ name, email, passwordHash: await bcrypt.hash(password, 10) });
    return { user, token: signToken(user) };
  } catch (e) {
    if (e.code === '23505') throw new AppError('An account with this email already exists.', 409);
    throw e;
  }
}

export async function login({ email, password }) {
  const row = await repo.findUserByEmail(String(email || '').trim().toLowerCase());
  const ok = row && (await bcrypt.compare(String(password || ''), row.password_hash));
  if (!ok) throw new AppError('Wrong email or password.', 401);
  const user = { id: row.id, name: row.name, email: row.email };
  return { user, token: signToken(user) };
}
