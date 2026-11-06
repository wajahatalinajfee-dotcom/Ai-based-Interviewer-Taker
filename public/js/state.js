const $ = (id) => document.getElementById(id);
const LV = ['L1 Newbie', 'L2 Junior', 'L3 Mid', 'L4 Expert'];
let ansId = 'ans', role = 'basics', level = 0, S = null, rec = null, listening = false, busy = false, scores = [], streak = 0, curQ = '';
const synth = window.speechSynthesis;
const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
if (!SR) $('warn').textContent = 'Voice answers need Chrome or Edge. You can still type your answers.';
let lang = 'en', liveIdx = -1, plannedTotal = 0;
// Fixed phrases the browser speaks itself (everything else comes from the AI in the chosen language).
const T = {
  en: { up: (l) => `Nice work. Moving up to ${l}.`, down: (l) => `Let's step back to ${l} and build up.`, codeShown: ' The code is shown on screen.',
    coding: (t, d) => `Now a coding problem. ${t}. ${d} Explain your approach out loud, then write the code.`, hr: 'Now a few behavioral questions. Use real examples from your experience.' },
  ur: { up: (l) => `شاباش۔ اب ${l} لیول پر جا رہے ہیں۔`, down: (l) => `آئیے ${l} لیول پر واپس چلتے ہیں اور مضبوط بنتے ہیں۔`, codeShown: ' کوڈ اسکرین پر موجود ہے۔',
    coding: (t, d) => `اب ایک کوڈنگ مسئلہ۔ ${t}۔ ${d} پہلے اپنا طریقہ بتائیں، پھر کوڈ لکھیں۔`, hr: 'اب رویّے سے متعلق چند سوالات۔ اپنے تجربے سے حقیقی مثالیں دیں۔' },
};
