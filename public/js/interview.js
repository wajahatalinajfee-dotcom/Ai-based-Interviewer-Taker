const esc = (t) => String(t ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

async function start() {
  $('serr').textContent = ''; $('start').disabled = true; $('start').textContent = 'Preparing your first question…';
  try {
    if (synth) synth.getVoices();
    ensureMic().then((ok) => { if (!ok) $('status').textContent = 'Microphone is blocked. Type your answer, or allow the mic in the address bar.'; }); // never wait for the permission prompt
    S = await api('/api/interview/start', { role, level, lang, jd: $('jd').value });
    go('room'); scores = []; streak = 0; S.n = 0; level = S.level; resetTurns(S.total);
    $('avg').textContent = '–'; $('avg').className = ''; $('streak').textContent = 'No answers yet'; $('ladder').style.visibility = 'visible';
    drawLadder(level);
    $('submit').onclick = submit;
    await showQ(S.q);
  } catch (e) { $('serr').textContent = e.message; }
  $('start').disabled = false; $('start').innerHTML = 'Start interview <span class="dot2"></span>';
}
$('start').onclick = start;

async function submit() {
  if (busy) return;
  busy = true; await stopListen(); synth && synth.cancel();
  const answer = $('ans').value.trim();
  $('status').textContent = 'Reviewing your answer…'; $('submit').disabled = true;
  try {
    const r = await api('/api/interview/answer', { id: S.id, answer });
    const e = r.eval; scores.push(e.score); S.n++; streak = e.score >= 7 ? streak + 1 : 0;
    updateBoard(`${S.n} of ${S.total} answered`);
    finishTurn(liveIdx, { answer, score: e.score, detail: `accuracy ${e.accuracy}, depth ${e.depth}, clarity ${e.clarity}` + nlpText(e), feedback: e.feedback, better: e.better_answer, tip: e.tip,
      missed: missedPoints(e), evidence: e.evidence, terms: (e.nlp && e.nlp.terms) || [] });
    if (r.levelChanged) { drawLadder(r.level); level = r.level; await speak(T[lang][r.levelChanged > 0 ? 'up' : 'down'](LV[r.level])); }
    busy = false;
    await speak(e.feedback);
    if (r.done) return startCoding();
    await showQ(r.next);
  } catch (err) { $('status').textContent = err.message; }
  busy = false; $('submit').disabled = false;
}

// Continue a saved interview exactly where the user left off.
async function resumeInterview(dbId) {
  try {
    const r = await api('/api/interview/resume', { id: dbId });
    S = { id: r.id, total: r.total, n: r.turns.filter((t) => t.round === 'technical').length };
    lang = r.lang; document.body.classList.toggle('ur', lang === 'ur');
    level = r.level; scores = r.turns.map((t) => t.score).filter((x) => x != null); streak = 0; ansId = 'ans'; busy = false;
    ensureMic();
    go('room'); $('submit').disabled = false; $('ladder').style.visibility = r.phase === 'hr' ? 'hidden' : 'visible'; drawLadder(level);
    resetTurns(0);
    r.turns.forEach((t) => pushDone({ topic: (t.followUp ? 'Follow-up: ' : '') + t.topic, question: t.question, answer: t.answer, score: t.score, feedback: t.feedback, better: t.better, tip: t.tip }));
    if (scores.length) updateBoard(`${r.turns.length} answered so far`); else { $('avg').textContent = '–'; $('avg').className = ''; $('streak').textContent = 'No answers yet'; }
    if (r.phase === 'technical') { $('submit').onclick = submit; plannedTotal = r.total; await showQ(r.q); }
    else if (r.phase === 'coding') await startCoding(r.problem);
    else if (r.phase === 'hr' && r.q) {
      hrN = r.turns.filter((t) => t.round === 'hr').length; hrTotal = r.hrTotal;
      plannedTotal = r.turns.length + (hrTotal - hrN); $('submit').onclick = submitHr; await showQ(r.q);
    } else if (r.phase === 'hr') await startHr();
    else finish();
  } catch (e) { alert(e.message); }
}
