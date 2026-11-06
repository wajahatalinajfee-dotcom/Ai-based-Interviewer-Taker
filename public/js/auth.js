let user = null, authMode = 'signup';

async function loadMe() {
  try { user = (await api('/api/auth/me')).user; } catch { user = null; }
  renderNav();
}
function renderNav() {
  $('navActions').innerHTML = user
    ? `<button class="ghost" onclick="go('dash')">Dashboard</button><button class="dark" onclick="startFlow()">Start interview <span class="dot2"></span></button>`
    : `<button class="ghost" onclick="openAuth('login')">Log in</button><button class="dark" onclick="openAuth('signup')">Get started <span class="dot2"></span></button>`;
  const n = user ? user.name : '';
  $('whoName').textContent = n.split(' ')[0]; $('whoAv').textContent = n ? n[0].toUpperCase() : ''; $('mName').textContent = n; $('mEmail').textContent = user ? user.email : '';
}
function openAuth(mode, replace) {
  authMode = mode; const su = mode === 'signup';
  $('atitle').textContent = su ? 'Create your account' : 'Welcome back';
  $('asub').textContent = su ? 'Save your interviews and track your progress.' : 'Log in to see your dashboard.';
  $('nameRow').hidden = !su; $('apass').autocomplete = su ? 'new-password' : 'current-password';
  $('asubmit').firstChild.textContent = su ? 'Create account ' : 'Log in ';
  $('aswap').textContent = su ? 'Already have an account?' : 'New here?';
  $('atoggle').textContent = su ? 'Log in' : 'Create an account';
  $('aerr').textContent = ''; go('auth', replace);
}
async function submitAuth() {
  $('aerr').textContent = ''; $('asubmit').disabled = true;
  try {
    const r = await api('/api/auth/' + authMode, { name: $('aname').value, email: $('aemail').value, password: $('apass').value });
    user = r.user; $('apass').value = ''; renderNav(); go('dash');
  } catch (e) { $('aerr').textContent = e.message; }
  $('asubmit').disabled = false;
}
async function logout() { try { await api('/api/auth/logout', {}); } catch {} user = null; renderNav(); go('home'); }
function startFlow() { user ? go('setup') : openAuth('signup'); }
