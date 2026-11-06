// Fakes the Gemini API so tests never need a key or internet. Returns the real fetch for local calls.
export const cfg = { rubric: ['a', 'b', 'c'], accuracy: 9 }; // tests can change what the fake AI returns
export function installGeminiMock() {
  const realFetch = globalThis.fetch;
  const rw = () => Array.from({ length: 8 }, () => String.fromCharCode(97 + Math.floor(Math.random() * 26))).join('');
  const reply = (p) => {
    if (p.includes('Write ONE interview question')) return { question: `Describe how ${rw()} differs from ${rw()} and ${rw()} in practice`, code: null, rubric: cfg.rubric };
    if (p.includes('Score accuracy, depth and clarity')) return { accuracy: cfg.accuracy, depth: cfg.accuracy, clarity: cfg.accuracy, missed: [], feedback: 'Good.', better_answer: 'x', tip: 'y' };
    if (p.includes('probing a candidate')) return { question: `Follow up ${rw()} about ${rw()}`, rubric: ['specific detail'] };
    if (p.includes('JavaScript coding problem')) return { title: 'Add numbers', description: 'Add two numbers.', functionName: 'add', starterCode: 'function add(a,b){}', tests: [{ args: [1, 2], expected: 3 }, { args: [2, 2], expected: 4 }, { args: [0, 0], expected: 0 }], hint: 'h' };
    if (p.includes('Review correctness')) return { correctness: 8, efficiency: 8, readability: 8, explanation_match: 8, issues: [], feedback: 'Nice.', tip: 't', optimized_code: '' };
    if (p.includes('behavioral interview question')) return { question: `Tell me about ${rw()} teamwork ${rw()} example ${rw()}` };
    if (p.includes('STAR method')) return { star: { situation: true, task: false, action: true, result: true }, structure: 9, ownership: 8, clarity: 8, feedback: 'ok', better_answer: 'b', tip: 't' };
    if (p.includes('honest summary')) return { summary: 's', strengths: ['a'], weak_topics: [{ topic: 't', reason: 'r' }], plan_7_days: ['d'], communication_tips: ['c'], suggested_level: 'L2' };
    throw new Error('unmocked prompt: ' + p.slice(0, 60));
  };
  globalThis.fetch = async (url, opts) => {
    if (!String(url).includes('generativelanguage')) return realFetch(url, opts);
    const body = reply(JSON.parse(opts.body).contents[0].parts[0].text);
    return new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: JSON.stringify(body) }] } }] }), { status: 200 });
  };
  return realFetch;
}
