function drawProg() { renderPager(); }
function drawLadder(l) {
  [...$('ladder').children].forEach((el, i) => el.className = i === l ? 'on' : i < l ? 'past' : '');
}
async function showQ(q) {
  curQ = q.question; $('q').textContent = q.question; $('ans').value = ''; committed = '';
  $('code').hidden = !q.code; $('code').textContent = q.code || '';
  liveIdx = openTurn((q.followUp ? 'Follow-up: ' : '') + q.topic, q.question, q.code);
  await speak(q.question + (q.code ? T[lang].codeShown : ''));
  startListen();
}
function updateBoard(text) {
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  $('avg').textContent = avg.toFixed(1); $('avg').className = cls(avg);
  $('streak').textContent = streak > 1 ? `${streak} strong answers in a row` : text;
}

// Short text about the NLP measures of an answer, shown under the score.
function nlpText(e) {
  const n = e.nlp || {}, cov = n.coverage || [], parts = [];
  if (cov.length) parts.push(`covered ${cov.filter((c) => c.covered).length} of ${cov.length} key points`);
  if (n.fillers) parts.push(`${n.fillers} filler words`);
  if (n.hedges) parts.push(`${n.hedges} hedging phrases`);
  return parts.length ? '; ' + parts.join(', ') : '';
}
const missedPoints = (e) => ((e.nlp && e.nlp.coverage) || []).filter((c) => !c.covered).map((c) => c.point);
