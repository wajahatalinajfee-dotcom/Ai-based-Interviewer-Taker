$('repeat').onclick = async () => { await speak(curQ); startListen(); };
$('submit').onclick = submit;
$('cmic').onclick = () => (listening ? stopListen() : startListen());
$('crun').onclick = async () => { if (problem) renderResults(await runTests()); };
$('csubmit').onclick = submitCode;
$('cskip').onclick = () => { stopListen(); synth && synth.cancel(); startHr(); };
$('editor').onkeydown = (e) => {
  if (e.key !== 'Tab') return;
  e.preventDefault();
  const t = e.target, i = t.selectionStart;
  t.value = t.value.slice(0, i) + '  ' + t.value.slice(t.selectionEnd);
  t.selectionStart = t.selectionEnd = i + 2;
};
initHome();
loadMe().then(() => route(location.pathname));
addEventListener('popstate', () => route(location.pathname));
['ans', 'approach'].forEach((id) => $(id).addEventListener('input', () => { committed = $(id).value.trim() + ' '; }));
