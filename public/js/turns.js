/* One entry per question. Numbered pager + topic list choose which single answer review is shown. */
let turns = [], sel = -1;
const cap = (t) => (t ? t[0].toUpperCase() + t.slice(1) : 'Question');

function resetTurns(total) { turns = []; sel = -1; plannedTotal = total || 0; renderTurns(); }
function openTurn(topic, question, code) { turns.push({ topic: cap(topic), question, code, done: false }); sel = turns.length - 1; renderTurns(); return sel; }
function finishTurn(i, d) { Object.assign(turns[i], d, { done: true }); sel = i; renderTurns(); }
function pushDone(d) { turns.push({ done: true, ...d }); sel = turns.length - 1; renderTurns(); }
function selectTurn(i) { sel = i; renderTurns(); }
function renderTurns() { renderPager(); renderTopics(); renderReview(); }

function renderPager() {
  const n = Math.max(turns.length, plannedTotal);
  $('prog').innerHTML = Array.from({ length: n }, (_, i) => {
    const t = turns[i];
    return t ? `<button class="pg ${i === sel ? 'on' : ''} ${t.done ? 'ok' : ''}" onclick="selectTurn(${i})" aria-label="Question ${i + 1}">${i + 1}</button>`
             : `<button class="pg" disabled aria-label="Question ${i + 1}, not asked yet">${i + 1}</button>`;
  }).join('');
}
function renderTopics() {
  $('qlist').innerHTML = turns.map((t, i) => `<li class="${i === sel ? 'now' : ''}" onclick="selectTurn(${i})">${esc(t.topic)}</li>`).join('');
}
function renderReview() {
  const t = turns[sel];
  if (!t) { $('rows').innerHTML = '<div class="card"><p class="lbl">The review of each answer appears here.</p></div>'; return; }
  if (!t.done) { $('rows').innerHTML = `<div class="card"><span class="lbl">Question ${sel + 1}</span><h3>${esc(t.topic)}</h3><p class="lbl">Waiting for your answer…</p></div>`; return; }
  $('rows').innerHTML = `<div class="card rev" dir="auto"><span class="lbl">Question ${sel + 1} · ${esc(t.topic)}</span>
    <div class="rscore ${cls(t.score)}">${t.score}<small>/10</small></div><span class="lbl">${esc(t.detail || '')}</span>
    <p class="qline">${esc(t.question)}</p>
    <h4>Your answer</h4><p>${esc(t.answer) || '<i>No answer was captured</i>'}</p>
    <h4>Feedback</h4><p>${esc(t.feedback)}</p>
    ${t.better ? `<details><summary>Better answer</summary><p>${esc(t.better)}</p></details>` : ''}
    ${t.tip ? `<p><b>Tip:</b> ${esc(t.tip)}</p>` : ''}
    ${t.missed && t.missed.length ? `<p class="lbl">Not clearly covered: ${esc(t.missed.join('; '))}</p>` : ''}
    ${t.terms && t.terms.length ? `<p class="lbl">Technical terms you used: ${esc(t.terms.join(', '))}</p>` : ''}
    ${t.evidence ? `<p class="lbl">Evidence from your answer: “${esc(t.evidence)}”</p>` : ''}</div>`;
}
