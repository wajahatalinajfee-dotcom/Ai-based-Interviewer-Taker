import { env } from '../config/env.js';
import * as auth from '../services/auth.service.js';
import { currentUser } from '../middleware/auth.js';

const setCookie = (res, token) => res.cookie('token', token, { httpOnly: true, sameSite: 'lax', secure: env.isProd, maxAge: 7 * 24 * 3600 * 1000 });

export const signup = async (req, res) => { const { user, token } = await auth.signup(req.body); setCookie(res, token); res.status(201).json({ user }); };
export const login = async (req, res) => { const { user, token } = await auth.login(req.body); setCookie(res, token); res.json({ user }); };
export const logout = (_req, res) => { res.clearCookie('token'); res.json({ ok: true }); };
export const me = async (req, res) => {
  const user = await currentUser(req);
  if (!user) return res.status(401).json({ error: 'Not logged in.' });
  res.json({ user });
};
