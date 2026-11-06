let hrN = 0, hrTotal = 3;
const STAR_KEYS = ['situation', 'task', 'action', 'result'];

async function startHr() {
  go('room'); ansId = 'ans'; busy = false; $('submit').disabled = false;
  $('ladder').style.visibility = 'hidden'; $('status').textContent = 'Preparing the HR round…';
  try {
    const r = await api('/api/interview/hr/start', { id: S.id });
    hrTotal = r.total; hrN = 0; plannedTotal = turns.length + hrTotal; renderTurns();
    $('submit').onclick = submitHr;
    await speak(T[lang].hr); await showQ(r.q);
  } catch (e) { $('status').textContent = e.message + ' Showing your results instead.'; setTimeout(finish, 2500); }
}

async function submitHr() {
  if (busy) return;
  busy = true; await stopListen(); synth && synth.cancel();
  const answer = $('ans').value.trim();
  $('status').textContent = 'Reviewing your answer…'; $('submit').disabled = true;
  try {
    const r = await api('/api/interview/hr/answer', { id: S.id, answer });
    const e = r.eval; scores.push(e.score); hrN++; streak = e.score >= 7 ? streak + 1 : 0;
    updateBoard(`HR question ${hrN} of ${hrTotal}`);
    const got = STAR_KEYS.filter((k) => e.star[k]), miss = STAR_KEYS.filter((k) => !e.star[k]);
    finishTurn(liveIdx, { answer, score: e.score, feedback: e.feedback, better: e.better_answer, tip: e.tip,
      detail: `structure ${e.structure}, ownership ${e.ownership}, clarity ${e.clarity}${e.fillers ? `, ${e.fillers} filler words` : ''}. STAR covered: ${got.join(', ') || 'none'}${miss.length ? '; missing: ' + miss.join(', ') : ''}` });
    busy = false; await speak(e.feedback);
    if (r.done) { $('submit').disabled = false; return finish(); }
    await showQ(r.next);
  } catch (err) { $('status').textContent = err.message; }
  busy = false; $('submit').disabled = false;
}
