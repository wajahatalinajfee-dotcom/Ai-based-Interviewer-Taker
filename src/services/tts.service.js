import { env } from '../config/env.js';
import { AppError } from '../utils/AppError.js';

const cache = new Map(); // same sentence twice (e.g. "Hear again") costs no extra quota

// Gemini returns raw 16-bit mono PCM at 24 kHz; browsers need a WAV header to play it.
export function pcmToWav(pcm, rate = 24000) {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.length, 4); h.write('WAVEfmt ', 8); h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24); h.writeUInt32LE(rate * 2, 28);
  h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([h, pcm]);
}

export async function synthesize(text, lang) {
  text = String(text || '').trim().slice(0, 600);
  if (!text) throw new AppError('Nothing to speak.', 400);
  const key = `${lang}|${text}`;
  if (cache.has(key)) return cache.get(key);
  if (!env.geminiKey) throw new AppError('Missing GEMINI_API_KEY in .env', 500);
  const prompt = lang === 'ur' ? `Say this in Urdu, in a calm, professional interviewer voice: ${text}` : text;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${env.geminiTtsModel}:generateContent`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiKey },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseModalities: ['AUDIO'], speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } } } } }),
  });
  if (r.status === 429) throw new AppError('The AI voice quota is busy. Showing text only for now.', 429);
  if (!r.ok) throw new AppError(`The AI voice service could not speak this (${r.status}). Your key or model may not support Urdu speech.`, 502);
  const j = await r.json();
  const part = (j.candidates?.[0]?.content?.parts || []).find((p) => p.inlineData);
  if (!part) throw new AppError('The AI voice service returned no audio.', 502);
  const wav = pcmToWav(Buffer.from(part.inlineData.data, 'base64'));
  if (cache.size > 60) cache.delete(cache.keys().next().value);
  cache.set(key, wav);
  return wav;
}
