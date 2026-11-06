let problem = null;

function workerBody() {
  self.onmessage = (m) => {
    const { code, name, tests } = m.data;
    let fn;
    try { fn = new Function(code + '\n;return typeof ' + name + '==="function"?' + name + ':null;')(); }
    catch (e) { return self.postMessage([{ pass: false, error: String(e) }]); }
    if (!fn) return self.postMessage([{ pass: false, error: 'Function ' + name + ' was not found' }]);
    const out = [];
    for (const t of tests) {
      const base = { args: JSON.stringify(t.args), expected: JSON.stringify(t.expected) };
      try { const got = JSON.stringify(fn(...t.args)); out.push({ ...base, got, pass: got === base.expected }); }
      catch (e) { out.push({ ...base, pass: false, error: String(e) }); }
    }
    self.postMessage(out);
  };
}

// Runs the candidate's code in a Web Worker with a 3 second limit.
function runTests() {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob(['(' + workerBody.toString() + ')()'], { type: 'text/javascript' }));
    const w = new Worker(url);
    const done = (r) => { clearTimeout(timer); w.terminate(); URL.revokeObjectURL(url); resolve(r); };
    const timer = setTimeout(() => done([{ pass: false, error: 'Timed out after 3 seconds. Check for an infinite loop.' }]), 3000);
    w.onmessage = (e) => done(e.data);
    w.onerror = (e) => done([{ pass: false, error: String(e.message) }]);
    w.postMessage({ code: $('editor').value, name: problem.functionName, tests: problem.tests });
  });
}

function renderResults(res) {
  $('results').innerHTML = res.map((r) => `<li class="${r.pass ? 'hi' : 'lo'}">${r.pass ? 'Pass' : 'Fail'}: ${esc(r.args || '')}
    ${r.pass ? '' : r.error ? '- ' + esc(r.error) : `- expected ${esc(r.expected)}, got ${esc(r.got)}`}</li>`).join('');
}

async function startCoding(existing) {
  go('coding'); $('cstatus').textContent = 'Preparing your coding problem…';
  try {
    problem = existing || await api('/api/interview/coding/start', { id: S.id });
    $('ctitle').textContent = problem.title; $('cdesc').textContent = problem.description;
    $('editor').value = problem.starterCode; $('approach').value = ''; $('results').innerHTML = ''; $('review').hidden = true;
    $('cstatus').textContent = ''; ansId = 'approach';
    await speak(T[lang].coding(problem.title, problem.description));
    startListen();
  } catch (e) { $('cstatus').textContent = e.message + ' You can skip to your results.'; }
}

async function submitCode() {
  if (busy || !problem) return;
  busy = true; stopListen(); synth && synth.cancel(); $('csubmit').disabled = true;
  $('cstatus').textContent = 'Running tests and reviewing…';
  try {
    const res = await runTests(); renderResults(res);
    const r = await api('/api/interview/coding/submit', { id: S.id, approach: $('approach').value, code: $('editor').value, results: res });
    $('cstatus').textContent = ''; renderCodeReview(r);
    busy = false; await speak(r.feedback);
  } catch (e) { $('cstatus').textContent = e.message; }
  busy = false; $('csubmit').disabled = false;
}

function renderCodeReview(r) {
  pushDone({ topic: 'Coding', question: problem.title, answer: $('approach').value.trim(), score: r.score, feedback: r.feedback, tip: r.tip,
    detail: `tests ${r.passed}/${r.total}; correctness ${r.correctness}, efficiency ${r.efficiency}, readability ${r.readability}, explanation ${r.explanation_match}` });
  const sc = (n, v) => `<div><b class="${cls(v)}">${v}</b>${n}</div>`;
  $('review').hidden = false;
  $('review').innerHTML = `<div class="sc">${sc('overall', r.score)}${sc('correct', r.correctness)}${sc('efficiency', r.efficiency)}${sc('readability', r.readability)}${sc('explanation', r.explanation_match)}</div>
    <p>${esc(r.feedback)}</p>${r.issues.length ? `<ul class="p">${r.issues.map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
    <p><b>Tip:</b> ${esc(r.tip)}</p>
    ${r.optimized_code ? `<details><summary>Show an improved version</summary><pre>${esc(r.optimized_code)}</pre></details>` : ''}
    <button class="go" onclick="startHr()">Continue to the HR round</button>`;
}
