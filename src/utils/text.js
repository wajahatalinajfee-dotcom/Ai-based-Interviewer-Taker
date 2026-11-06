export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const words = (t) => new Set(t.toLowerCase().match(/[a-z]{5,}/g) || []);

// True when two questions share more than half of their meaningful words.
export const similar = (a, b) => {
  const A = words(a), B = words(b);
  const inter = [...A].filter((w) => B.has(w)).length;
  return inter / Math.max(1, A.size + B.size - inter) > 0.5;
};

// Counts common filler words and phrases in a transcript.
export const countFillers = (t = '') => (String(t).match(/\b(um+|uh+|erm|you know|i mean|basically|kind of|sort of)\b/gi) || []).length;
export const countWords = (t = '') => (String(t).match(/\S+/g) || []).length;
