import { env } from '../config/env.js';

// Fallback analyzer in plain JavaScript: used when the Python NLP service is not running.
// Lexical only (no embeddings), so the Python service is more accurate.
const STOP = new Set(['the', 'and', 'for', 'with', 'that', 'this', 'are', 'was', 'you', 'not', 'but', 'have', 'from', 'they', 'will', 'what', 'when', 'your', 'can', 'how', 'why', 'into', 'than', 'then', 'them', 'its', 'has', 'had', 'who', 'which', 'also', 'just', 'very']);
const FILLERS = ['um', 'umm', 'uh', 'uhh', 'erm', 'hmm', 'you know', 'i mean', 'basically', 'actually', 'kind of', 'sort of', 'matlab', 'yani', 'yaani', 'acha', 'مطلب', 'یعنی', 'اچھا', 'ہمم'];
const HEDGES = ['maybe', 'perhaps', 'i think', 'i guess', 'probably', 'not sure', 'i believe', 'might', 'possibly', 'shayad', 'mera khayal', 'lagta hai', 'شاید', 'میرا خیال ہے', 'لگتا ہے'];

const toks = (t) => String(t).toLowerCase().match(/[\p{L}\p{N}']+/gu) || [];
const stem = (w) => (/^[a-z]+$/.test(w) ? w.replace(/(ing|ed|es|s)$/, '') : w);
const stems = (t) => toks(t).filter((w) => w.length > 2 && !STOP.has(w) && !/^\d+$/.test(w)).map(stem);
const esc = (p) => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countPhrases = (text, list) => {
  const low = String(text).toLowerCase(), items = {};
  for (const p of list) {
    const n = (low.match(new RegExp(`(?<![\\p{L}\\p{N}_])${esc(p)}(?![\\p{L}\\p{N}_])`, 'gu')) || []).length;
    if (n) items[p] = n;
  }
  return { count: Object.values(items).reduce((a, b) => a + b, 0), items };
};

export function jsAnalyze({ text = '', rubric = [] }) {
  const have = new Set(stems(text));
  const coverage = rubric.map((point) => {
    const p = [...new Set(stems(point))];
    if (!p.length) return null;
    const recall = p.filter((w) => have.has(w)).length / p.length;
    return { point, recall: Math.round(recall * 1000) / 1000, score: Math.round(recall * 1000) / 1000, covered: recall >= 0.5 };
  }).filter(Boolean);
  return {
    source: 'js-fallback', words: toks(text).length, sentences: String(text).split(/[.!?۔؟\n]+/).filter((s) => s.trim()).length,
    fillers: countPhrases(text, FILLERS), hedges: countPhrases(text, HEDGES), terms: [], coverage, semantic_used: false,
    nlp_score: coverage.length ? Math.round((100 * coverage.filter((c) => c.covered).length) / coverage.length) / 10 : null,
  };
}

let downUntil = 0;
export const _resetNlpState = () => { downUntil = 0; };

// Calls the Python service; if it is down, remembers that for 30 s and uses the JavaScript fallback.
export async function analyze({ text, lang, rubric }) {
  if (env.nlpUrl && Date.now() > downUntil) {
    try {
      const r = await fetch(`${env.nlpUrl}/analyze`, { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, lang, rubric: (rubric || []).slice(0, 12) }), signal: AbortSignal.timeout(5000) });
      if (r.ok) return await r.json();
    } catch { /* service not running */ }
    downUntil = Date.now() + 30000;
  }
  return jsAnalyze({ text, rubric });
}
