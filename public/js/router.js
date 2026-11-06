const PAGES = ['home', 'auth', 'dash', 'setup', 'room', 'coding', 'result'];
const PATHS = { home: '/', auth: '/login', dash: '/dashboard', setup: '/interview', room: '/interview', coding: '/interview', result: '/interview' };

function go(page, replace) {
  PAGES.forEach((p) => { $(p).hidden = p !== page; });
  $('appbar').hidden = page === 'home' || page === 'auth';
  const path = page === 'auth' && authMode === 'signup' ? '/signup' : PATHS[page];
  if (location.pathname !== path) history[replace ? 'replaceState' : 'pushState']({}, '', path);
  window.scrollTo(0, 0);
  if (page === 'dash') loadDash();
  if (page === 'setup') loadResume();
}
const nav = (e, path) => { e.preventDefault(); route(path, true); };
// Chooses the page for a URL. Dashboard and interview need a login.
function route(path, push) {
  const p = path.replace(/\/$/, '') || '/', rp = !push;
  if (p === '/login') return openAuth('login', rp);
  if (p === '/signup') return openAuth('signup', rp);
  if (p === '/dashboard') return user ? go('dash', rp) : openAuth('login', rp);
  if (p === '/interview') return user ? go('setup', rp) : openAuth('signup', rp);
  go('home', rp);
}
