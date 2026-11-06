import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { resetTestDb, useTestDb } from './helpers/db.js';

useTestDb(); process.env.JWT_SECRET = 'test'; process.env.GEMINI_API_KEY = 'test';
const realFetch = globalThis.fetch;
let geminiCalls = 0, mode = 'ok';
globalThis.fetch = async (url, opts) => {
  if (!String(url).includes('generativelanguage')) return realFetch(url, opts);
  geminiCalls++;
  if (mode === 'quota') return new Response('{}', { status: 429 });
  if (mode === 'unsupported') return new Response('{}', { status: 400 });
  if (mode === 'empty') return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: 'no audio' }] } }] }), { status: 200 });
  return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ inlineData: { data: Buffer.alloc(480, 1).toString('base64') } }] } }] }), { status: 200 });
};
await resetTestDb();
const { pcmToWav } = await import('../src/services/tts.service.js'); // after the env vars above, because config is read on import
const { default: app } = await import('../src/app.js');
await (await import('../src/repositories/index.js')).repo.init();
const server = app.listen(0); await new Promise((r) => server.once('listening', r));
const root = `http://localhost:${server.address().port}`;
after(() => server.close());
const post = (path, body, cookie) => realFetch(root + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) }, body: JSON.stringify(body) });

test('pcmToWav writes a valid WAV header', () => {
  const wav = pcmToWav(Buffer.alloc(100));
  assert.equal(wav.subarray(0, 4).toString(), 'RIFF'); assert.equal(wav.subarray(8, 12).toString(), 'WAVE');
  assert.equal(wav.readUInt32LE(24), 24000); assert.equal(wav.readUInt32LE(40), 100); assert.equal(wav.length, 144);
});

test('/api/tts needs a login, returns WAV audio, and caches repeated sentences', async () => {
  assert.equal((await post('/api/tts', { text: 'سلام', lang: 'ur' })).status, 401);
  const su = await post('/api/auth/signup', { name: 'T', email: 'tts@example.com', password: 'password123' });
  const ck = su.headers.get('set-cookie').split(';')[0];
  const a = await post('/api/tts', { text: 'آپ کا نام کیا ہے؟', lang: 'ur' }, ck);
  assert.equal(a.status, 200); assert.equal(a.headers.get('content-type'), 'audio/wav');
  assert.equal(Buffer.from(await a.arrayBuffer()).subarray(0, 4).toString(), 'RIFF');
  const before = geminiCalls;
  await post('/api/tts', { text: 'آپ کا نام کیا ہے؟', lang: 'ur' }, ck);
  assert.equal(geminiCalls, before); // served from cache
  assert.equal((await post('/api/tts', { text: '  ', lang: 'ur' }, ck)).status, 400);
  mode = 'quota'; assert.equal((await post('/api/tts', { text: 'نیا جملہ ایک', lang: 'ur' }, ck)).status, 429);
  mode = 'unsupported'; const u = await post('/api/tts', { text: 'نیا جملہ دو', lang: 'ur' }, ck);
  assert.equal(u.status, 502); assert.match((await u.json()).error, /Urdu/);
  mode = 'empty'; assert.equal((await post('/api/tts', { text: 'نیا جملہ تین', lang: 'ur' }, ck)).status, 502);
});
