async function api(url, body) {
  const r = await fetch(url, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : undefined);
  const j = await r.json();
  if (!r.ok) throw new Error(j.error || 'Something went wrong.');
  return j;
}
const cls = (s) => s >= 7.5 ? 'hi' : s >= 5 ? 'md' : 'lo';
const col = (s) => s >= 7.5 ? 'var(--good)' : s >= 5 ? 'var(--mid)' : 'var(--bad)';
