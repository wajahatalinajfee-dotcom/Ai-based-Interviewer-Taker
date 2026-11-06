const ROLE_NAMES = { basics: 'Programming basics', mern: 'MERN', mean: 'MEAN', ai: 'AI developer' };
const fmtDate = (d) => new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });

async function loadDash() {
  if (!user) return openAuth('login');
  $('dhello').textContent = 'Hello, ' + user.name.split(' ')[0];
  $('dbody').innerHTML = '<p class="lbl">Loading your data…</p>';
  try { renderDash(await api('/api/dashboard')); }
  catch (e) { if (/log in/i.test(e.message)) { user = null; renderNav(); return openAuth('login'); } $('dbody').innerHTML = `<p class="err">${esc(e.message)}</p>`; }
}
function renderDash(d) {
  const s = d.stats;
  const un = d.unfinished && d.unfinished.length ? `<div class="card" style="margin-bottom:16px"><h2>Unfinished interviews</h2>${d.unfinished.map((u) => `<div class="rrow2"><b>${esc(ROLE_NAMES[u.role] || u.role)}</b><span class="lbl">${u.answered} answered · ${fmtDate(u.createdAt)}</span><span class="ctrl"><button class="dark resume-btn" onclick="resumeInterview(${u.id})">Continue <span class="dot2"></span></button><button class="ghost" onclick="discardInterview(${u.id})">Discard</button></span></div>`).join('')}</div>` : '';
  if (!s.total) { $('dbody').innerHTML = un + '<div class="card empty"><h2>No interviews yet</h2><p class="sub">Your scores, trends and history will appear here after your first practice interview.</p><button class="dark" onclick="go(\'setup\')">Start your first interview <span class="dot2"></span></button></div>'; return; }
  $('dbody').innerHTML = un + `
    <div class="tiles">
      <div class="card tile"><span class="lbl">Interviews</span><b>${s.total}</b></div>
      <div class="card tile"><span class="lbl">Average score</span><b style="color:${col(s.avg)}">${s.avg}</b><small>out of 10</small></div>
      <div class="card tile"><span class="lbl">Best score</span><b style="color:${col(s.best)}">${s.best}</b></div>
      <div class="card tile"><span class="lbl">Current level</span><b>${esc((LV[s.level] || '').split(' ')[0])}</b></div>
    </div>
    <div class="dgrid">
      <div class="card"><h2>Score trend</h2><div class="tl">${d.trend.map((t) => `<b title="${fmtDate(t.date)}: ${t.overall}" style="height:${t.overall * 10}%;--c:${col(t.overall)}"></b>`).join('')}</div></div>
      <div class="card"><h2>Topics, best to weakest</h2>${d.topics.slice(0, 8).map((t) => `<div class="bar"><span>${esc(t.topic)}</span><span><i style="width:${t.avg * 10}%;--c:${col(t.avg)}"></i></span><span>${t.avg}</span></div>`).join('')}</div>
      <div class="card wide"><h2>Recent interviews</h2>${d.recent.map((i) => `<button class="rrow" onclick="openPast(${i.id})"><span>${fmtDate(i.createdAt)}</span><span>${esc(ROLE_NAMES[i.role] || i.role)}</span><span class="${cls(i.overall)}"><b>${i.overall}</b></span><span>${esc(LV[i.startLevel].split(' ')[0])} to ${esc(LV[i.endLevel].split(' ')[0])}</span></button>`).join('')}</div>
    </div>`;
}
async function openPast(id) {
  try { finish(await api('/api/dashboard/interviews/' + id)); } catch (e) { alert(e.message); }
}

async function loadResume() {
  $('resume').innerHTML = '';
  try {
    const u = (await api('/api/interview/active'))[0];
    if (u) $('resume').innerHTML = `<div class="card resume"><div><b>You have an unfinished ${esc(ROLE_NAMES[u.role] || u.role)} interview</b><br><span class="lbl">${u.answered} answered · started ${fmtDate(u.createdAt)}</span></div><div class="ctrl"><button class="dark resume-btn" onclick="resumeInterview(${u.id})">Continue <span class="dot2"></span></button><button class="ghost" onclick="discardInterview(${u.id})">Discard</button></div></div>`;
  } catch {}
}
async function discardInterview(id) {
  try { await api('/api/interview/discard', { id }); } catch {}
  loadResume(); if (!$('dash').hidden) loadDash();
}
