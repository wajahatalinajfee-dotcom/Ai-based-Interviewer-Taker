/* avatar, text-to-speech, speech-to-text, microphone meter */
const LANGS = { en: { tts: 'en-US', stt: 'en-US' }, ur: { tts: 'ur-PK', stt: 'ur-PK' } };
let committed = '', micStream = null, finishWait = null, mouthOpen = 2.5;

function setMode(m) { $('av').className = 'avatar ' + m; $('mic').classList.toggle('live', m === 'listening'); }
function mouth(v) { $('mouth').setAttribute('ry', v); }
function pickVoice() {
  const vs = synth ? synth.getVoices() : [], L = LANGS[lang].tts;
  return vs.find((v) => v.lang.replace('_', '-') === L) || vs.find((v) => v.lang.toLowerCase().startsWith(L.slice(0, 2))) || null;
}
let ttsFailed = false, ttsCtx = null;
// Fallback voice from the server (Gemini TTS). The avatar mouth follows the loudness of the audio.
async function speakRemote(text) {
  const r = await fetch('/api/tts', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, lang }) });
  if (!r.ok) throw new Error((await r.json()).error || 'AI voice failed.');
  const url = URL.createObjectURL(await r.blob()), audio = new Audio(url);
  ttsCtx = ttsCtx || new (window.AudioContext || window.webkitAudioContext)();
  const an = ttsCtx.createAnalyser(); an.fftSize = 256;
  const src = ttsCtx.createMediaElementSource(audio); src.connect(an); an.connect(ttsCtx.destination);
  const buf = new Uint8Array(an.frequencyBinCount); let raf = 0;
  return new Promise((res) => {
    const tick = () => { an.getByteFrequencyData(buf); mouth(2.5 + Math.min(9, buf.reduce((a, b) => a + b, 0) / buf.length / 6)); raf = requestAnimationFrame(tick); };
    const end = () => { cancelAnimationFrame(raf); mouth(2.5); setMode(''); URL.revokeObjectURL(url); res(); };
    audio.onplay = () => { setMode('speaking'); $('status').textContent = 'انٹرویور بول رہا ہے'; tick(); };
    audio.onended = audio.onerror = end;
    audio.play().catch(end);
  });
}
// No voice anywhere: show the text and animate the mouth for a moment so the interview still flows.
function speakSilently(text) {
  return new Promise((res) => {
    setMode('speaking');
    const t = setInterval(() => mouth((mouthOpen = mouthOpen === 2.5 ? 9 : 2.5)), 150);
    setTimeout(() => { clearInterval(t); mouth(2.5); setMode(''); res(); }, Math.min(7000, 1200 + text.length * 45));
  });
}
async function speak(text) {
  if (!synth) return;
  stopListen(); synth.cancel();
  const v = pickVoice();
  if (lang === 'ur' && !v) {
    if (!ttsFailed) {
      $('status').textContent = 'AI آواز تیار ہو رہی ہے…';
      try { return await speakRemote(text); }
      catch (e) { ttsFailed = true; $('status').textContent = e.message + ' For Urdu speech, open this site in Microsoft Edge, which includes Urdu voices.'; }
    }
    return speakSilently(text);
  }
  return new Promise((res) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = LANGS[lang].tts; if (v) u.voice = v; u.rate = 0.98;
    u.onstart = () => { setMode('speaking'); $('status').textContent = lang === 'ur' ? 'انٹرویور بول رہا ہے' : 'Interviewer is speaking'; };
    u.onboundary = (e) => {
      if (e.name && e.name !== 'word') return;
      const w = text.slice(e.charIndex).split(/\s/)[0].toLowerCase();
      mouth(/[aoe]/.test(w) ? 11 : /[iu]/.test(w) ? 7 : 5);
      setTimeout(() => mouth(2.5), 130);
    };
    u.onend = u.onerror = () => { mouth(2.5); setMode(''); res(); };
    synth.speak(u);
  });
}
// Tells the user which voices this browser actually has (shown when Urdu is chosen).
function voiceInfo() {
  const vs = synth ? synth.getVoices() : [], ur = vs.find((v) => v.lang.toLowerCase().startsWith('ur'));
  if (ur) return `Urdu voice found: ${ur.name}.`;
  return `This browser has no Urdu voice (${vs.length} voices found). The app will try an AI voice using your Gemini key. For the most reliable Urdu speech, open the site in Microsoft Edge.`;
}

// Microphone: asked once on a click (so the browser prompts), with a live level bar that proves the mic hears you.
async function ensureMic() {
  if (micStream) return true;
  if (!navigator.mediaDevices) return false;
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const ctx = new (window.AudioContext || window.webkitAudioContext)(), an = ctx.createAnalyser();
    an.fftSize = 256; ctx.createMediaStreamSource(micStream).connect(an);
    const buf = new Uint8Array(an.frequencyBinCount);
    (function tick() { an.getByteFrequencyData(buf); $('meter').style.width = Math.min(100, (buf.reduce((a, b) => a + b, 0) / buf.length) * 2.5) + '%'; requestAnimationFrame(tick); })();
    return true;
  } catch { return false; }
}

const STT_ERRORS = {
  'not-allowed': 'Microphone is blocked. Click the lock icon in the address bar, allow the microphone, then tap the mic button.',
  'service-not-allowed': 'Speech recognition is not allowed in this browser. Use Chrome or Edge, or type your answer.',
  'audio-capture': 'No microphone was found. Plug one in or type your answer.',
  network: 'Speech recognition could not reach its service (Chrome sends audio to Google). Check your internet connection, or type your answer.',
};
function startListen() {
  if (!SR || listening || busy) return;
  rec = new SR(); rec.continuous = true; rec.interimResults = true; rec.lang = LANGS[lang].stt;
  committed = $(ansId).value.trim() ? $(ansId).value.trim() + ' ' : '';
  rec.onstart = () => { $('status').textContent = lang === 'ur' ? 'سن رہا ہوں… اب بولیں' : 'Listening… speak now'; };
  rec.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) committed += t + ' '; else interim += t;
    }
    $(ansId).value = (committed + interim).trim();
  };
  rec.onerror = (e) => {
    if (STT_ERRORS[e.error]) { listening = false; setMode(''); $('status').textContent = STT_ERRORS[e.error]; }
  };
  rec.onend = () => {
    if (finishWait) { finishWait(); finishWait = null; }
    if (listening) setTimeout(() => { if (listening) { try { rec.start(); } catch {} } }, 250);
  };
  listening = true;
  try { rec.start(); } catch { listening = false; $('status').textContent = 'Could not start the microphone. Tap the mic button.'; return; }
  setMode('listening');
}
// Resolves after the last spoken words have been delivered, so nothing is lost when you press Done.
function stopListen() {
  const wasOn = listening; listening = false; setMode('');
  if (!rec || !wasOn) return Promise.resolve();
  return new Promise((res) => { finishWait = res; setTimeout(res, 800); try { rec.stop(); } catch { res(); } });
}
$('mic').onclick = () => (listening ? stopListen() : startListen());
