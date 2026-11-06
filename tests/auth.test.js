import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDb, useTestDb } from './helpers/db.js';

useTestDb(); process.env.JWT_SECRET = 'test-secret';
await resetTestDb();
const { default: app } = await import('../src/app.js');
await (await import('../src/repositories/index.js')).repo.init();
const server = app.listen(0); await new Promise((r) => server.once('listening', r));
const root = `http://localhost:${server.address().port}`;
const call = async (path, body, cookie) => {
  const r = await fetch(root + path, { method: body ? 'POST' : 'GET', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const raw = r.headers.get('set-cookie') || '';
  return { status: r.status, body: await r.json(), raw, cookie: raw.split(';')[0] };
};
after(() => server.close());
const user = { name: 'Ayesha', email: 'Ayesha@Example.com', password: 'password123' };

test('signup validates input', async () => {
  assert.equal((await call('/api/auth/signup', { ...user, password: 'short' })).status, 400);
  assert.equal((await call('/api/auth/signup', { ...user, email: 'nope' })).status, 400);
  assert.equal((await call('/api/auth/signup', { ...user, name: '' })).status, 400);
});

test('signup sets an httpOnly cookie and never returns the password hash', async () => {
  const r = await call('/api/auth/signup', user);
  assert.equal(r.status, 201); assert.match(r.raw, /HttpOnly/i);
  assert.equal(r.body.user.email, 'ayesha@example.com'); assert.equal(r.body.user.password_hash, undefined);
});

test('duplicate email is rejected, case-insensitively', async () => {
  assert.equal((await call('/api/auth/signup', { ...user, email: 'AYESHA@example.com' })).status, 409);
});

test('login: wrong password and unknown email give the same 401', async () => {
  const a = await call('/api/auth/login', { email: user.email, password: 'wrongpass1' });
  const b = await call('/api/auth/login', { email: 'who@example.com', password: 'password123' });
  assert.equal(a.status, 401); assert.equal(b.status, 401); assert.equal(a.body.error, b.body.error);
  assert.equal((await call('/api/auth/login', { email: user.email, password: user.password })).status, 200);
});

test('me and dashboard need a valid cookie', async () => {
  const l = await call('/api/auth/login', { email: user.email, password: user.password });
  assert.equal((await call('/api/auth/me', null, l.cookie)).body.user.name, 'Ayesha');
  assert.equal((await call('/api/auth/me')).status, 401);
  assert.equal((await call('/api/dashboard')).status, 401);
  assert.equal((await call('/api/dashboard', null, 'token=tampered')).status, 401);
  const d = await call('/api/dashboard', null, l.cookie);
  assert.equal(d.status, 200); assert.equal(d.body.stats.total, 0); assert.deepEqual(d.body.recent, []);
});

test('logout clears the cookie', async () => {
  const r = await call('/api/auth/logout', {});
  assert.match(r.raw, /token=;/);
});
