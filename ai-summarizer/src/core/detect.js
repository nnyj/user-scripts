export function generateSelector(el, depth = 0) {
  if (el.id) return '#' + CSS.escape(el.id);
  const tag = el.tagName.toLowerCase();
  const classes = [...el.classList]
    .filter(c => !/^(js-|ember-|react-|ng-|v-|_|active|hover|focus|selected|open|closed|visible|hidden|is-|has-)/.test(c) && c.length < 50)
    .slice(0, 3).map(c => '.' + CSS.escape(c)).join('');
  let sel = classes ? tag + classes : tag;
  if (depth < 10 && document.querySelectorAll(sel).length > 30 && el.parentElement && el.parentElement !== document.body) {
    return generateSelector(el.parentElement, depth + 1) + ' ' + sel;
  }
  return sel;
}

export function detectMainContent() {
  for (const sel of ['article', '[role="main"]', 'main', '#content', '.content', '.post-body', '.entry-content', '.article-body', '.story-body']) {
    const el = document.querySelector(sel);
    if (el?.innerText?.trim().length > 100) return sel;
  }
  let best = null, bestScore = 0;
  for (const el of document.querySelectorAll('div, section')) {
    const text = el.innerText?.trim() || '';
    if (text.length < 200) continue;
    const ratio = text.length / (el.innerHTML?.length || 1);
    const score = text.length * ratio;
    if (score > bestScore) { bestScore = score; best = el; }
  }
  return best ? generateSelector(best) : null;
}

export function detectComments() {
  const hints = ['comment', 'reply', 'response', 'message', 'discuss'];
  const candidates = new Map();
  for (const hint of hints) {
    for (const el of document.querySelectorAll(`[class*="${hint}"]`)) {
      if ((el.innerText?.trim().length || 0) < 20) continue;
      const cls = [...el.classList].find(c => c.toLowerCase().includes(hint));
      if (!cls) continue;
      const sel = '.' + CSS.escape(cls);
      const count = document.querySelectorAll(sel).length;
      if (count >= 2) candidates.set(sel, count);
    }
  }
  if (!candidates.size) return null;
  return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0];
}
