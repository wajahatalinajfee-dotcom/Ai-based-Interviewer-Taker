import { env } from '../config/env.js';
import { SYSTEM_PROMPT } from '../prompts/index.js';
import { AppError } from '../utils/AppError.js';

const endpoint = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

// Calls Gemini in JSON mode and returns the parsed object.
export async function gem(prompt, temperature, tries = 2) {
  if (!env.geminiKey) throw new AppError('Missing GEMINI_API_KEY in .env', 500);
  for (let i = 0; i < tries; i++) {
    const r = await fetch(endpoint(env.geminiModel), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': env.geminiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature, responseMimeType: 'application/json' },
      }),
    });
    if (r.status === 429) throw new AppError('The free AI quota is busy. Wait a minute and try again.', 429);
    if (!r.ok) throw new AppError(`AI request failed (${r.status}). Check your API key and model name.`, 502);
    try {
      const j = await r.json();
      return JSON.parse(j.candidates[0].content.parts[0].text.replace(/```json|```/g, ''));
    } catch { /* retry on malformed JSON */ }
  }
  throw new AppError('The AI returned an unreadable answer. Try again.', 502);
}
