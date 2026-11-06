async function finish(pre) {
  go('result');
  const head = '';
  $('result').innerHTML = head + '<h1 class="rtitle">Scoring your interview…</h1>';
  try {
    const r = pre || await api('/api/interview/report/' + S.id);
    const lv = (n) => esc((LV[n] || '').split(' ')[0]);
    const li = (a, f) => (a || []).map(f).join('');
    $('result').innerHTML = head + `<h1 class="rtitle">Your results</h1>
      <div class="tiles">
        <div class="card tile"><span class="lbl">Overall score</span><b style="color:${col(r.overall)}">${r.overall}</b><small>out of 10</small></div>
        <div class="card tile"><span class="lbl">Answers</span><b>${r.turns.length}</b><small>across all rounds</small></div>
        <div class="card tile"><span class="lbl">Level reached</span><b>${lv(r.endLevel)}</b><small>started at ${lv(r.startLevel)}</small></div>
        <div class="card tile"><span class="lbl">Filler words</span><b>${r.metrics.fillers}</b><small>in ${r.metrics.words} words</small></div>
      </div>
      <div class="rgrid">
        <div class="card"><h2>Summary</h2><p class="sum">${esc(r.summary)}</p>${r.recommendation ? `<p><b>Hiring view: ${esc(({ strong_hire: 'Strong hire', hire: 'Hire', lean_no: 'Lean no', no_hire: 'No hire' })[r.recommendation] || r.recommendation)}.</b> ${esc(r.recommendation_reason)}</p>` : ''}<span class="lbl">Suggested level: ${esc(r.suggested_level)}</span></div>
        <div class="card"><h2>Score by topic</h2>${li(r.topics, (t) => `<div class="bar"><span>${esc(t.topic)}</span><span><i style="width:${t.avg * 10}%;--c:${col(t.avg)}"></i></span><span>${t.avg}</span></div>`)}</div>
        <div class="card"><h2>Question by question</h2><div class="tl">${li(r.turns, (t) => `<b title="${esc(t.topic)}: ${t.score}" style="height:${t.score * 10}%;--c:${col(t.score)}"></b>`)}</div></div>
        <div class="card"><h2>What you did well</h2><ul class="p">${li(r.strengths, (x) => `<li>${esc(x)}</li>`)}</ul></div>
        <div class="card"><h2>What to improve</h2><ul class="p">${li(r.weak_topics, (x) => `<li><b>${esc(x.topic)}.</b> ${esc(x.reason)}</li>`)}</ul></div>
        <div class="card"><h2>How you sound</h2><ul class="p">${li(r.communication_tips, (x) => `<li>${esc(x)}</li>`)}</ul></div>
        <div class="card wide"><h2>Your answers</h2>${li(r.answers, (a, i) => `<details class="ans"><summary>${i + 1}. ${a.followUp ? 'Follow-up: ' : ''}${esc(a.topic || a.round)} <b class="${cls(a.score)}">${a.score}</b></summary><p class="qline" dir="auto">${esc(a.question)}</p><p dir="auto"><b>You:</b> ${esc(a.answer) || '<i>No answer</i>'}</p><p dir="auto">${esc(a.feedback)}</p>${a.better ? `<p dir="auto"><b>Better:</b> ${esc(a.better)}</p>` : ''}</details>`)}</div>
        <div class="card wide"><h2>Your 7-day plan</h2><ol class="plan">${li(r.plan_7_days, (x) => `<li>${esc(x)}</li>`)}</ol></div>
      </div>`;
  } catch (e) { $('result').innerHTML = head + `<h1 class="rtitle">Could not build your report</h1><p class="err">${esc(e.message)}</p><button class="dark" onclick="finish()">Try again</button>`; }
}
