// PLACEHOLDER FIGURES: replace with real numbers once you have usage data.
const SUCCESS_STATS = [
  { n: '4', l: 'interview rounds in one session' },
  { n: '4', l: 'adaptive difficulty levels' },
  { n: '+2.1', l: 'sample average score gain by the 3rd interview' },
  { n: '85%', l: 'sample share of users who reach a higher level' },
];
function initHome() {
  $('stats').innerHTML = SUCCESS_STATS.map((s) => `<div><b>${esc(s.n)}</b><span>${esc(s.l)}</span></div>`).join('');
  $('yr').textContent = new Date().getFullYear();
  const svg = $('av').querySelector('svg');
  $('heroAv').innerHTML = svg.outerHTML.replace(' id="mouth"', '');
  $('atoggle').onclick = (e) => { e.preventDefault(); openAuth(authMode === 'signup' ? 'login' : 'signup'); };
  $('asubmit').onclick = submitAuth;
  $('whoBtn').onclick = (e) => { e.stopPropagation(); const m = $('whoMenu'); m.hidden = !m.hidden; $('whoBtn').setAttribute('aria-expanded', String(!m.hidden)); };
  document.addEventListener('click', () => { $('whoMenu').hidden = true; });
  ['aname', 'aemail', 'apass'].forEach((id) => $(id).addEventListener('keydown', (e) => e.key === 'Enter' && submitAuth()));
}
