// ==UserScript==
// @name         AI Page Summarizer
// @match        *://*/*
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      localhost
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// ==/UserScript==

const DEFAULT_API        = 'http://localhost:1234/v1/chat/completions';
const DEFAULT_MAX_TOKENS = 2500;
const DEFAULT_MAX_CHARS  = 48000;
const DEFAULT_SYSTEM     = 'Extract key insights from this content. Use emoji bullet points. Prioritize unique, non-obvious information. Where opinions diverge, note both sides. Be concise, omit filler words.';

function getApiUrl()    { return GM_getValue('ais-api-url', DEFAULT_API); }
function getModelsUrl() { return getApiUrl().replace('/chat/completions', '/models'); }
function getMaxTokens() { return GM_getValue('ais-max-tokens', DEFAULT_MAX_TOKENS); }
function getMaxChars()  { return GM_getValue('ais-max-chars', DEFAULT_MAX_CHARS); }
function getSystem()    { return GM_getValue('ais-system-prompt', DEFAULT_SYSTEM); }

// --- Content extraction ---

function queryText(sel) {
  try {
    return [...document.querySelectorAll(sel)]
      .map(el => el.innerText.trim()).filter(t => t.length > 10).join('\n---\n');
  } catch { return ''; }
}
function queryFirst(sel) {
  try { return document.querySelector(sel)?.innerText?.trim() || ''; }
  catch { return ''; }
}
function joinSections(post, comments) {
  const parts = [];
  if (post) parts.push(post);
  if (comments) parts.push('=== Comments ===\n\n' + comments);
  return parts.join('\n\n');
}

// --- Site config ---

const SITE_CONFIGS_KEY = 'ais-site-configs';
const DEFAULT_CONFIGS = {
  'old.reddit.com':       { post: '.thing.link .usertext-body .md', comments: '.comment .usertext-body .md' },
  'news.ycombinator.com': { post: '', comments: '.commtext' },
  'lobste.rs':            { post: '.story_text', comments: '.comment_text' },
  'lemmy':                { post: '.post-listing .md, .post-content', comments: '.comment .md' },
  'tildes.net':           { post: '.topic-text-original', comments: '.comment-text' },
  'stackexchange.com':    { post: '.question .s-prose', comments: '.answer .s-prose' },
  'stackoverflow.com':    { post: '.question .s-prose', comments: '.answer .s-prose' },
};

function getSiteConfigs() { return GM_getValue(SITE_CONFIGS_KEY, {}); }
function getSiteConfig(domain) { return getSiteConfigs()[domain] || null; }
function saveSiteConfig(domain, config) {
  const all = getSiteConfigs();
  all[domain] = config;
  GM_setValue(SITE_CONFIGS_KEY, all);
}
function deleteSiteConfig(domain) {
  const all = getSiteConfigs();
  delete all[domain];
  GM_setValue(SITE_CONFIGS_KEY, all);
}

function getAutoSummarizeSites() { return GM_getValue('ais-auto-summarize-sites', {}); }
function getAutoSummarize(host) { return !!getAutoSummarizeSites()[host]; }
function setAutoSummarize(host, val) {
  const all = getAutoSummarizeSites();
  if (val) all[host] = true;
  else delete all[host];
  GM_setValue('ais-auto-summarize-sites', all);
}

// --- Discourse detection ---

function isDiscourse() {
  return !!document.querySelector('meta[name="generator"][content^="Discourse"]')
    || !!document.querySelector('.discourse-root, #discourse-main')
    || document.body.classList.contains('discourse');
}

async function extractDiscourse() {
  try {
    const m = location.pathname.match(/\/t\/[^/]+\/(\d+)/);
    if (m) {
      const resp = await fetch(`/t/${m[1]}.json`);
      const data = await resp.json();
      const posts = data.post_stream?.posts
        ?.map(p => p.cooked?.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim())
        .filter(t => t?.length > 10)
        .slice(0, 100);
      if (posts?.length) {
        const [first, ...rest] = posts;
        return joinSections(first, rest.join('\n---\n'));
      }
    }
  } catch {}
  const posts = [...document.querySelectorAll('.topic-post .cooked, .post-stream .cooked')]
    .map(el => el.innerText.trim()).filter(t => t.length > 10);
  if (!posts.length) return '';
  const [first, ...rest] = posts;
  return joinSections(first, rest.join('\n---\n'));
}

// --- Auto-detection heuristics ---

function detectMainContent() {
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

function detectComments() {
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

// --- Selector generation ---

function generateSelector(el) {
  if (el.id) return '#' + CSS.escape(el.id);
  const tag = el.tagName.toLowerCase();
  const classes = [...el.classList]
    .filter(c => !/^(js-|ember-|react-|ng-|v-|_|active|hover|focus|selected|open|closed|visible|hidden|is-|has-)/.test(c) && c.length < 50)
    .slice(0, 3).map(c => '.' + CSS.escape(c)).join('');
  let sel = classes ? tag + classes : tag;
  if (document.querySelectorAll(sel).length > 30 && el.parentElement && el.parentElement !== document.body) {
    return generateSelector(el.parentElement) + ' ' + sel;
  }
  return sel;
}

// --- Active config + extraction ---

function getActiveConfig() {
  const host = location.hostname;
  const saved = getSiteConfig(host);
  if (saved) return { ...saved, source: 'saved' };
  for (const [domain, config] of Object.entries(DEFAULT_CONFIGS)) {
    if (host.includes(domain)) return { ...config, source: 'default' };
  }
  if (isDiscourse()) return { post: '', comments: '', discourse: true, source: 'discourse' };
  return { post: detectMainContent(), comments: detectComments(), source: 'auto' };
}

async function extractContent() {
  const config = getActiveConfig();
  if (config.discourse) {
    const r = await extractDiscourse();
    if (r) return r;
  }
  const post = config.post ? queryFirst(config.post) : '';
  const comments = config.comments ? queryText(config.comments) : '';
  const result = joinSections(post, comments);
  if (result) return result;
  return [...document.querySelectorAll('p')]
    .map(p => p.innerText.trim()).filter(t => t.length > 40).join('\n\n');
}

// --- Highlight extracted elements ---

let highlightedEls = [];

function clearHighlights() {
  for (const { el, prev } of highlightedEls) {
    el.style.backgroundColor = prev || '';
    el.style.transition = '';
  }
  highlightedEls = [];
}

function highlightExtracted() {
  clearHighlights();
  const config = getActiveConfig();
  const els = [];
  try { if (config.post) document.querySelectorAll(config.post).forEach(el => els.push(el)); } catch {}
  try { if (config.comments) document.querySelectorAll(config.comments).forEach(el => els.push(el)); } catch {}
  if (!els.length) return;
  for (const el of els) {
    const prev = el.style.backgroundColor;
    el.style.transition = 'background-color 0.3s';
    el.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
    highlightedEls.push({ el, prev });
  }
}

// --- <think> + markdown rendering ---

function renderResponse(text) {
  // Normalize plain "Thinking Process:" blocks (models without <think> tags)
  text = text.replace(/^(Thinking Process:\n[\s\S]+?)(?=\n\n[A-Z][^*\d\s]|\n---|\n#{1,3} |$)/, '<think>$1\n</think>');
  const container = document.createElement('div');
  const parts = [];
  const re = /<think(?:ing)?>([\s\S]*?)<\/think(?:ing)?>/gi;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', body: text.slice(last, m.index) });
    parts.push({ type: 'think', body: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', body: text.slice(last) });

  for (const part of parts) {
    if (part.type === 'text') {
      const div = document.createElement('div');
      div.innerHTML = marked.parse(part.body);
      container.appendChild(div);
    } else {
      const details  = document.createElement('details');
      const summary  = document.createElement('summary');
      const inner    = document.createElement('div');
      summary.textContent = 'Thinking...';
      inner.className = 'think-body';
      inner.innerHTML = marked.parse(part.body);
      details.append(summary, inner);
      container.appendChild(details);
    }
  }
  return container;
}

// --- UI ---

const STYLES = `
  #ais-panel {
    position: fixed; z-index: 2147483646; top: 0; right: 0;
    width: 50vw; height: 100%; min-width: 220px;
    background: #1a1a1b; color: #d7dadc; border-radius: 8px 0 0 8px;
    font: 13px/1.5 system-ui,sans-serif; box-shadow: -4px 0 16px rgba(0,0,0,.6);
    display: none; flex-direction: column; overflow: hidden;
    opacity: 0; transform: translateX(100%);
    transition: opacity .2s, transform .25s ease;
  }
  #ais-panel.ais-open { transform: translateX(0); }
  #ais-opacity {
    width: 80px; height: 4px; cursor: pointer; accent-color: #818384;
    margin: 0;
  }
  #ais-resize {
    position: absolute; left: 0; top: 0; width: 6px; height: 100%;
    cursor: ew-resize; z-index: 1;
  }
  #ais-resize:hover { background: rgba(255,255,255,.08); }
  #ais-header {
    padding: 8px 12px; background: #272729; border-radius: 8px 0 0 0;
    user-select: none; flex-shrink: 0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; color: #818384;
  }
  #ais-close { cursor: pointer; font-size: 20px; line-height: 1; color: #818384; }
  #ais-close:hover { color: #d7dadc; }
  #ais-body { padding: 12px; padding-bottom: 60px; overflow-y: auto; flex: 1; }
  #ais-body :is(h1,h2,h3) { color: #d7dadc; margin: 8px 0 4px; font-size: 14px; }
  #ais-body :is(ul,ol) { padding-left: 18px; margin: 4px 0; }
  #ais-body li { margin: 2px 0; }
  #ais-body p { margin: 4px 0; }
  #ais-body strong { color: #fff; }
  #ais-body a { color: #0079d3; }
  #ais-body code { background: #272729; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  #ais-body pre code { display: block; padding: 8px; }
  #ais-body details summary { cursor: pointer; color: #818384; font-size: 11px; margin: 6px 0 2px; list-style: none; }
  #ais-body details summary::before { content: '▶ '; }
  #ais-body details[open] summary::before { content: '▼ '; }
  .think-body { color: #818384; font-size: 11px; border-left: 2px solid #333; padding-left: 8px; margin: 2px 0; }
  #ais-regen { background: #5f6368; }
  #ais-regen:hover { background: #4a4f53; }
  #ais-btns {
    position: fixed; bottom: 20px; right: 20px; z-index: 2147483647;
    display: flex; gap: 6px; flex-direction: row-reverse;
    transition: right .25s ease, transform .25s ease;
  }
  #ais-btns button {
    padding: 8px 14px; color: #fff; border: none; border-radius: 6px;
    cursor: pointer; font: bold 13px system-ui,sans-serif;
    box-shadow: 0 2px 8px rgba(0,0,0,.4);
    opacity: 0.3; transition: opacity .2s, background .15s, transform .25s;
  }
  #ais-btns:hover button { opacity: 1; }
  #ais-btn { background: #ff4500; }
  #ais-btn:hover { background: #e03d00; }
  #ais-copy-btn { background: #5f6368; }
  #ais-copy-btn:hover { background: #4a4f53; }
  #ais-copy-sum { background: #0079d3; }
  #ais-copy-sum:hover { background: #0063ad; }
  #ais-auto-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: #818384; cursor: pointer; user-select: none;
  }
  #ais-auto-label input { margin: 0; cursor: pointer; }
  #ais-gear { cursor: pointer; font-size: 20px; line-height: 1; color: #818384; margin-right: 4px; }
  #ais-gear:hover { color: #d7dadc; }
  #ais-settings {
    background: #222; border-bottom: 1px solid #333;
    padding: 0 12px; max-height: 0; overflow: hidden;
    transition: max-height .25s ease, padding .25s ease;
    font-size: 11px;
  }
  #ais-settings.ais-cfg-open { max-height: 500px; padding: 8px 12px; overflow-y: auto; }
  .ais-cfg-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
  .ais-cfg-row label { color: #818384; width: 65px; flex-shrink: 0; }
  .ais-cfg-row input[type="text"] {
    flex: 1; min-width: 0; background: #1a1a1b; border: 1px solid #333;
    color: #d7dadc; padding: 2px 6px; border-radius: 3px; font: 11px monospace;
  }
  .ais-cfg-row button, .ais-cfg-btns button {
    background: #5f6368; color: #fff; border: none; padding: 2px 8px;
    border-radius: 3px; cursor: pointer; font-size: 10px; white-space: nowrap;
  }
  .ais-cfg-row button:hover, .ais-cfg-btns button:hover { background: #4a4f53; }
  .ais-cfg-btns { display: flex; gap: 4px; justify-content: space-between; margin-top: 6px; }
  #ais-cfg-source { color: #616384; font-size: 10px; font-style: italic; }
  #ais-picker-hl {
    position: absolute; z-index: 2147483645; pointer-events: none; display: none;
    background: rgba(255, 255, 0, 0.15); border: 2px solid rgba(255, 200, 0, 0.7);
    transition: top .04s, left .04s, width .04s, height .04s;
  }
  #ais-picker-bar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647;
    background: #272729; color: #d7dadc; padding: 6px 16px;
    font: 12px system-ui, sans-serif; display: none;
    align-items: center; gap: 12px; box-shadow: 0 -2px 8px rgba(0,0,0,.4);
  }
  .ais-picker-label { white-space: nowrap; }
  .ais-picker-sel {
    color: #818384; flex: 1; font: 11px monospace;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ais-picker-cancel {
    background: #5f6368; color: #fff; border: none; padding: 4px 12px;
    border-radius: 4px; cursor: pointer; font-size: 11px;
  }
`;

const mk = (tag, props) => Object.assign(document.createElement(tag), props);

document.head.appendChild(mk('style', { textContent: STYLES }));

const panel    = mk('div',    { id: 'ais-panel' });
const resize   = mk('div',    { id: 'ais-resize' });
const header   = mk('div',    { id: 'ais-header', innerHTML: '<span id="ais-title"></span>' });
const opacitySlider = mk('input', { id: 'ais-opacity', type: 'range', min: 20, max: 100, value: 80 });
const closeBtn = mk('span',   { id: 'ais-close', textContent: '×' });
const body     = mk('div',    { id: 'ais-body' });
const btnWrap  = mk('div',    { id: 'ais-btns' });
const btn      = mk('button', { id: 'ais-btn', textContent: 'Summarize' });
const copyBtn  = mk('button', { id: 'ais-copy-btn', textContent: 'Copy' });
const copySumBtn = mk('button', { id: 'ais-copy-sum', textContent: 'Copy Summary', style: 'display:none' });
const regenBtn = mk('button', { id: 'ais-regen', textContent: 'Regenerate', style: 'display:none' });
const autoLabel = mk('label', { id: 'ais-auto-label' });
const autoCheck = mk('input', { type: 'checkbox' });
autoLabel.append(autoCheck, 'Auto-summarize');
opacitySlider.addEventListener('input', () => {
  panel.style.opacity = opacitySlider.value / 100;
  GM_setValue('ais-opacity', Number(opacitySlider.value));
});
const savedOpacity = GM_getValue('ais-opacity', 80);
opacitySlider.value = savedOpacity;
const gearBtn = mk('span', { id: 'ais-gear', textContent: '\u2699', title: 'Site selectors' });
const settingsDiv = mk('div', { id: 'ais-settings' });
settingsDiv.innerHTML = `
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
    <span>Site: <b style="color:#d7dadc">${location.hostname}</b> <span id="ais-cfg-source"></span></span>
  </div>
  <div class="ais-cfg-row">
    <label>Post</label>
    <input type="text" id="ais-cfg-post" placeholder="CSS selector">
    <button id="ais-pick-post" title="Pick element">\u22b9</button>
  </div>
  <div class="ais-cfg-row">
    <label>Comments</label>
    <input type="text" id="ais-cfg-comments" placeholder="CSS selector">
    <button id="ais-pick-comments" title="Pick element">\u22b9</button>
  </div>
  <div class="ais-cfg-row" style="align-items:flex-start">
    <label style="margin-top:4px">System</label>
    <textarea id="ais-cfg-system" placeholder="System prompt" rows="3"
      style="flex:1;min-width:0;background:#1a1a1b;border:1px solid #333;color:#d7dadc;padding:4px 6px;border-radius:3px;font:12px/1.4 monospace;resize:vertical;min-height:40px"></textarea>
  </div>
  <div class="ais-cfg-row">
    <label>API URL</label>
    <input type="text" id="ais-cfg-api" placeholder="API endpoint">
  </div>
  <div class="ais-cfg-row">
    <label>Tokens</label>
    <input type="text" id="ais-cfg-tokens" style="width:80px;flex:none">
    <label style="width:auto;margin-left:8px">Chars</label>
    <input type="text" id="ais-cfg-chars" style="width:80px;flex:none">
  </div>
  <div class="ais-cfg-btns">
    <div style="display:flex;gap:4px"><button id="ais-cfg-import">Import</button><button id="ais-cfg-export">Export</button></div>
    <div style="display:flex;gap:4px"><button id="ais-cfg-reset">Reset</button><button id="ais-cfg-save">Save</button></div>
  </div>`;
const pickerHighlight = mk('div', { id: 'ais-picker-hl' });
const pickerBar = mk('div', { id: 'ais-picker-bar' });
pickerBar.innerHTML = '<span class="ais-picker-label"></span><span class="ais-picker-sel"></span><button class="ais-picker-cancel">Cancel</button>';
header.append(opacitySlider, autoLabel, gearBtn, closeBtn);
panel.append(resize, header, settingsDiv, body);
btnWrap.append(btn, copySumBtn, regenBtn, copyBtn);
document.body.append(panel, btnWrap, pickerHighlight, pickerBar);

// --- Fetch model name ---

GM_xmlhttpRequest({
  method: 'GET', url: getModelsUrl(),
  onload(res) {
    try {
      const name = JSON.parse(res.responseText).data?.[0]?.id;
      if (name) document.getElementById('ais-title').textContent = name;
    } catch {}
  }
});

// --- State ---

const STORAGE_KEY = 'ais-panel-width';
const savedW = localStorage.getItem(STORAGE_KEY);
if (savedW) panel.style.width = savedW + 'px';
const getPanelWidth = () => panel.getBoundingClientRect().width || window.innerWidth * 0.5;
const isVisible = () => panel.style.display === 'flex';

// --- Resize ---

let resizing = false;
resize.addEventListener('mousedown', e => { resizing = true; e.preventDefault(); });
document.addEventListener('mousemove', e => {
  if (!resizing) return;
  const w = Math.max(220, Math.min(window.innerWidth - e.clientX, window.innerWidth * 0.8));
  panel.style.width = w + 'px';
});
document.addEventListener('mouseup', () => {
  if (resizing) localStorage.setItem(STORAGE_KEY, Math.round(getPanelWidth()));
  resizing = false;
});
window.addEventListener('resize', () => {
  const maxW = window.innerWidth * 0.8;
  if (getPanelWidth() > maxW) {
    panel.style.width = '50vw';
    localStorage.removeItem(STORAGE_KEY);
  }
});

// --- Copy ---

copyBtn.addEventListener('click', async () => {
  highlightExtracted();
  const text = await extractContent();
  if (!text) return;
  navigator.clipboard.writeText(`Page: ${document.title}\n\n${text}`).then(() => {
    copyBtn.textContent = 'Copied!';
    setTimeout(() => { copyBtn.textContent = 'Copy'; }, 1500);
  });
});

// --- Toggle / Summarize ---

const showPanel = () => {
  panel.style.display = 'flex';
  panel.style.opacity = opacitySlider.value / 100;
  requestAnimationFrame(() => panel.classList.add('ais-open'));
  copySumBtn.style.display = '';
  regenBtn.style.display = cachedResponse ? '' : 'none';
};
const hidePanel = () => {
  panel.classList.remove('ais-open');
  copySumBtn.style.display = 'none';
  regenBtn.style.display = 'none';
  setTimeout(() => { if (!panel.classList.contains('ais-open')) panel.style.display = 'none'; }, 250);
};

let activeReq = null;
const closePanel = () => { if (activeReq) { activeReq.abort(); activeReq = null; } hidePanel(); clearHighlights(); btn.textContent = 'Summarize'; };
closeBtn.addEventListener('click', closePanel);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && isVisible()) closePanel(); });
document.addEventListener('mousedown', e => {
  if (pickerActive) return;
  if (isVisible() && !panel.contains(e.target) && !btnWrap.contains(e.target)) closePanel();
});

copySumBtn.addEventListener('click', () => {
  const text = body.innerText?.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    copySumBtn.textContent = 'Copied!';
    setTimeout(() => { copySumBtn.textContent = 'Copy Summary'; }, 1500);
  });
});

let cachedResponse = null;

async function runSummary() {
  if (activeReq) return;
  highlightExtracted();
  const text = await extractContent();
  if (!text) { body.textContent = 'No content found.'; return; }

  cachedResponse = null;
  body.textContent = 'Thinking...';
  regenBtn.style.display = 'none';

  let full = '', lastLen = 0;
  activeReq = GM_xmlhttpRequest({
    method: 'POST', url: getApiUrl(),
    headers: { 'Content-Type': 'application/json' },
    data: JSON.stringify({
      model: 'local',
      messages: [
        { role: 'system', content: getSystem() },
        { role: 'user',   content: `Page: ${document.title}\n\n${text}`.slice(0, getMaxChars()) }
      ],
      max_tokens: getMaxTokens(), stream: true
    }),
    onprogress(res) {
      const chunk = res.responseText.slice(lastLen);
      lastLen = res.responseText.length;
      for (const line of chunk.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
        try {
          const delta = JSON.parse(trimmed.slice(6)).choices[0].delta?.content;
          if (delta) full += delta;
        } catch {}
      }
      body.innerHTML = '';
      body.appendChild(renderResponse(full));
    },
    onload() {
      activeReq = null;
      if (full) {
        cachedResponse = full;
        body.innerHTML = '';
        body.appendChild(renderResponse(full));
        regenBtn.style.display = '';
      } else body.textContent = 'Error parsing response.';
    },
    onerror() { activeReq = null; body.textContent = 'Failed to reach LM Studio — is it running?'; regenBtn.style.display = ''; }
  });
}

regenBtn.addEventListener('click', () => {
  if (activeReq) { activeReq.abort(); activeReq = null; }
  runSummary();
});

btn.addEventListener('click', () => {
  if (isVisible()) { closePanel(); return; }

  showPanel();
  btn.textContent = 'Close';

  if (cachedResponse) {
    body.innerHTML = '';
    body.appendChild(renderResponse(cachedResponse));
    regenBtn.style.display = '';
  } else {
    runSummary();
  }
});

// --- Element picker ---

let pickerActive = false;
let pickerTarget = null;
let pickerHovered = null;
let pickerDepthStack = [];

function startPicker(target) {
  pickerTarget = target;
  pickerActive = true;
  document.body.style.cursor = 'crosshair';
  pickerBar.style.display = 'flex';
  pickerBar.querySelector('.ais-picker-label').textContent = `Pick ${target} element \u2014 \u2191\u2193 adjust depth \u2014 Esc cancel`;
}

function stopPicker() {
  pickerActive = false;
  pickerHovered = null;
  pickerDepthStack = [];
  document.body.style.cursor = '';
  pickerHighlight.style.display = 'none';
  pickerBar.style.display = 'none';
}

function updatePickerHighlight() {
  if (!pickerHovered) return;
  const rect = pickerHovered.getBoundingClientRect();
  Object.assign(pickerHighlight.style, {
    display: 'block',
    top: rect.top + window.scrollY + 'px',
    left: rect.left + window.scrollX + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  });
  const sel = generateSelector(pickerHovered);
  const count = document.querySelectorAll(sel).length;
  pickerBar.querySelector('.ais-picker-sel').textContent = `${sel} (${count} match${count !== 1 ? 'es' : ''})`;
}

document.addEventListener('mousemove', (e) => {
  if (!pickerActive) return;
  const el = e.target;
  if (!el || el === pickerHighlight || pickerBar.contains(el) || panel.contains(el) || btnWrap.contains(el)) return;
  pickerHovered = el;
  pickerDepthStack = [];
  updatePickerHighlight();
}, true);

document.addEventListener('click', (e) => {
  if (!pickerActive) return;
  if (pickerBar.contains(e.target)) return;
  e.preventDefault();
  e.stopPropagation();
  if (!pickerHovered) return;
  const sel = generateSelector(pickerHovered);
  const host = location.hostname;
  const config = getSiteConfig(host) || { post: '', comments: '' };
  config[pickerTarget] = sel;
  saveSiteConfig(host, config);
  stopPicker();
  updateSettingsInputs();
  highlightExtracted();
}, true);

document.addEventListener('keydown', (e) => {
  if (!pickerActive) return;
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stopPicker(); return; }
  if (e.key === 'ArrowUp' && pickerHovered?.parentElement && pickerHovered.parentElement !== document.body && pickerHovered.parentElement !== document.documentElement) {
    e.preventDefault();
    pickerDepthStack.push(pickerHovered);
    pickerHovered = pickerHovered.parentElement;
    updatePickerHighlight();
  }
  if (e.key === 'ArrowDown' && pickerDepthStack.length) {
    e.preventDefault();
    pickerHovered = pickerDepthStack.pop();
    updatePickerHighlight();
  }
}, true);

pickerBar.querySelector('.ais-picker-cancel').addEventListener('click', stopPicker);

// --- Settings UI ---

function updateSettingsInputs() {
  const config = getActiveConfig();
  document.getElementById('ais-cfg-post').value = config.post || '';
  document.getElementById('ais-cfg-comments').value = config.comments || '';
  document.getElementById('ais-cfg-source').textContent = `(${config.source})`;
  document.getElementById('ais-cfg-system').value = getSystem();
  document.getElementById('ais-cfg-api').value = getApiUrl();
  document.getElementById('ais-cfg-tokens').value = getMaxTokens();
  document.getElementById('ais-cfg-chars').value = getMaxChars();
}

gearBtn.addEventListener('click', () => {
  settingsDiv.classList.toggle('ais-cfg-open');
  if (settingsDiv.classList.contains('ais-cfg-open')) updateSettingsInputs();
});

document.getElementById('ais-pick-post').addEventListener('click', () => startPicker('post'));
document.getElementById('ais-pick-comments').addEventListener('click', () => startPicker('comments'));

document.getElementById('ais-cfg-save').addEventListener('click', (e) => {
  saveSiteConfig(location.hostname, {
    post: document.getElementById('ais-cfg-post').value.trim(),
    comments: document.getElementById('ais-cfg-comments').value.trim(),
  });
  GM_setValue('ais-system-prompt', document.getElementById('ais-cfg-system').value.trim() || DEFAULT_SYSTEM);
  GM_setValue('ais-api-url', document.getElementById('ais-cfg-api').value.trim() || DEFAULT_API);
  GM_setValue('ais-max-tokens', parseInt(document.getElementById('ais-cfg-tokens').value) || DEFAULT_MAX_TOKENS);
  GM_setValue('ais-max-chars', parseInt(document.getElementById('ais-cfg-chars').value) || DEFAULT_MAX_CHARS);
  cachedResponse = null;
  highlightExtracted();
  const b = e.currentTarget;
  b.textContent = 'Saved!';
  setTimeout(() => { b.textContent = 'Save'; }, 1500);
});

document.getElementById('ais-cfg-reset').addEventListener('click', () => {
  deleteSiteConfig(location.hostname);
  GM_setValue('ais-system-prompt', DEFAULT_SYSTEM);
  GM_setValue('ais-api-url', DEFAULT_API);
  GM_setValue('ais-max-tokens', DEFAULT_MAX_TOKENS);
  GM_setValue('ais-max-chars', DEFAULT_MAX_CHARS);
  updateSettingsInputs();
  highlightExtracted();
  cachedResponse = null;
});

document.getElementById('ais-cfg-export').addEventListener('click', () => {
  const data = JSON.stringify({
    siteConfigs: { ...DEFAULT_CONFIGS, ...getSiteConfigs() },
    autoSummarize: GM_getValue('ais-auto-summarize-sites', {}),
    systemPrompt: getSystem(),
    apiUrl: getApiUrl(),
    maxTokens: getMaxTokens(),
    maxChars: getMaxChars(),
  }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'ais-settings.json';
  a.click();
  URL.revokeObjectURL(a.href);
});

document.getElementById('ais-cfg-import').addEventListener('click', () => {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.addEventListener('change', () => {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (imported.siteConfigs) {
          GM_setValue(SITE_CONFIGS_KEY, { ...getSiteConfigs(), ...imported.siteConfigs });
          if (imported.autoSummarize) GM_setValue('ais-auto-summarize-sites', { ...GM_getValue('ais-auto-summarize-sites', {}), ...imported.autoSummarize });
          if (imported.systemPrompt) GM_setValue('ais-system-prompt', imported.systemPrompt);
          if (imported.apiUrl) GM_setValue('ais-api-url', imported.apiUrl);
          if (imported.maxTokens) GM_setValue('ais-max-tokens', imported.maxTokens);
          if (imported.maxChars) GM_setValue('ais-max-chars', imported.maxChars);
        } else {
          GM_setValue(SITE_CONFIGS_KEY, { ...getSiteConfigs(), ...imported });
        }
        autoCheck.checked = getAutoSummarize(location.hostname);
        updateSettingsInputs();
        const importBtn = document.getElementById('ais-cfg-import');
        importBtn.textContent = 'Imported!';
        importBtn.style.background = '#4caf50';
        setTimeout(() => { importBtn.textContent = 'Import'; importBtn.style.background = ''; }, 1500);
      } catch { alert('Invalid JSON file'); }
    };
    reader.readAsText(file);
  });
  input.click();
});

// --- Clear highlights on interaction ---

function onPageInteraction() {
  if (highlightedEls.length && !isVisible()) clearHighlights();
}
window.addEventListener('scroll', () => {
  onPageInteraction();
  if (isVisible() && !panel.matches(':hover')) closePanel();
}, { passive: true });
document.addEventListener('click', (e) => {
  if (btnWrap.contains(e.target) || panel.contains(e.target)) return;
  onPageInteraction();
});
document.addEventListener('keydown', onPageInteraction);

// --- Auto-summarize ---

autoCheck.checked = getAutoSummarize(location.hostname);
autoCheck.addEventListener('change', () => {
  setAutoSummarize(location.hostname, autoCheck.checked);
});

if (autoCheck.checked) {
  const trigger = () => {
    setTimeout(() => {
      if (!isVisible() && !activeReq) {
        showPanel();
        btn.textContent = 'Close';
        runSummary();
      }
    }, 3000);
  };
  if (document.readyState === 'complete') trigger();
  else window.addEventListener('load', trigger);
}
