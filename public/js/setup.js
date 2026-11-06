function bind(id, set) {
  $(id).onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    [...$(id).children].forEach((x) => x.setAttribute('aria-pressed', x === b));
    set(b.dataset.v);
  };
}
bind('roles', (v) => role = v);
bind('levels', (v) => level = +v);
bind('langs', (v) => { lang = v; document.body.classList.toggle('ur', v === 'ur'); showVoiceInfo(); });
function showVoiceInfo() { $('vinfo').textContent = lang === 'ur' ? voiceInfo() : ''; }
if (synth) synth.onvoiceschanged = showVoiceInfo;
