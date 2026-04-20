import { PROVIDERS, DEFAULTS, modelSupportsThinking } from './config.js';
import { STYLES } from './styles.js';
import { renderResponse, initMermaid } from './render.js';
import { initPicker, startPicker, isPickerActive } from './picker.js';
import * as storage from '../adapters/storage.js';
import * as http from '../adapters/http.js';
import {
  extractContent, getActiveConfig, getSiteConfigs, saveSiteConfig, deleteSiteConfig,
  highlightExtracted, clearHighlights, hasHighlights,
  getAutoSummarize, setAutoSummarize, getHiddenDomains, setHiddenDomains,
} from './extract.js';

const mk = (tag, props) => Object.assign(document.createElement(tag), props);

function flashBtn(btn, text, restore) {
  if (!btn) return;
  btn.textContent = text;
  setTimeout(() => { btn.textContent = restore; }, 1500);
}

const cfg = (key) => storage.get(key, DEFAULTS[key]);
const cfgInt = async (key) => Math.max(1, parseInt(await cfg(key), 10) || DEFAULTS[key]);

async function getBaseUrl() {
  const p = await cfg('ais-provider');
  if (p === 'custom') return (await storage.get('ais-custom-url', '')).replace(/\/+$/, '');
  return PROVIDERS[p]?.url || PROVIDERS[DEFAULTS['ais-provider']].url;
}

async function getAuthHeaders() {
  const h = { 'Content-Type': 'application/json' };
  const k = await cfg('ais-api-key');
  if (k) h['Authorization'] = `Bearer ${k}`;
  return h;
}

async function getFullModel(available) {
  const p = await cfg('ais-provider');
  const explicit = await cfg('ais-model');
  if (p === 'lmstudio') return explicit || '';
  const m = explicit || available?.[0] || 'default';
  if (p === 'cliproxyapi') {
    const s = await cfg('ais-model-suffix');
    return s ? m + s : m;
  }
  return m;
}

let availableModels = [];

async function fetchModels(cb, overrideUrl) {
  const url = overrideUrl || (await getBaseUrl()) + '/models';
  try {
    const data = await http.fetchJson(url, await getAuthHeaders());
    availableModels = (data.data || []).map(m => m.id).sort();
  } catch { availableModels = []; }
  if (cb) cb();
}

export async function createUI(options = {}) {
  if (window.innerWidth < 400 || window.innerHeight < 300) return;
  if (document.querySelector('#challenge-running, #challenge-stage, .cf-browser-verification, #turnstile-wrapper')
      || document.title === 'Just a moment...') return;

  const hidden = await getHiddenDomains();
  if (hidden[location.hostname]) return;

  initMermaid();

  const uiHost = mk('div', { id: 'ais-host' });
  uiHost.style.cssText = 'all: initial; position: static;';
  const uiRoot = uiHost.attachShadow({ mode: 'open' });
  uiRoot.appendChild(mk('style', { textContent: STYLES }));

  const $ = id => uiRoot.getElementById(id);

  const panel = mk('div', { id: 'ais-panel' });
  const resize = mk('div', { id: 'ais-resize' });
  const header = mk('div', { id: 'ais-header', innerHTML: '<span id="ais-title"></span>' });
  const opacityVal = await storage.get('ais-opacity', DEFAULTS['ais-opacity']);
  const opacitySlider = mk('input', { id: 'ais-opacity', type: 'range', min: 20, max: 100, value: opacityVal });
  const closeBtn = mk('span', { id: 'ais-close', textContent: '\u00d7' });
  const body = mk('div', { id: 'ais-body' });
  const btnWrap = mk('div', { id: 'ais-btns' });
  const btn = mk('button', { id: 'ais-btn', textContent: 'Summarize' });
  const copyBtn = mk('button', { id: 'ais-copy-btn', textContent: 'Copy' });
  const copySumBtn = mk('button', { id: 'ais-copy-sum', textContent: 'Copy Summary', style: 'display:none' });
  const regenBtn = mk('button', { id: 'ais-regen', textContent: 'Regenerate', style: 'display:none' });
  const hideBtn = mk('button', { id: 'ais-hide', textContent: '\u00d7', title: `Hide on ${location.hostname}` });
  const autoLabel = mk('label', { id: 'ais-auto-label' });
  const autoCheck = mk('input', { type: 'checkbox' });
  autoLabel.append(autoCheck, 'Auto-summarize');

  opacitySlider.addEventListener('input', () => {
    panel.style.opacity = opacitySlider.value / 100;
    storage.set('ais-opacity', Number(opacitySlider.value));
  });

  const gearBtn = mk('span', { id: 'ais-gear', textContent: '\u2699', title: 'Site selectors' });
  const settingsDiv = mk('div', { id: 'ais-settings' });
  settingsDiv.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span>Site: <b id="ais-cfg-host" style="color:#d7dadc"></b> <span id="ais-cfg-source"></span></span>
    </div>
    <div class="ais-cfg-row">
      <label>Post</label>
      <input type="text" id="ais-cfg-post" placeholder="CSS selector">
      <button id="ais-pick-post" title="Pick element">\u22b9</button>
      <button class="ais-cfg-field-reset" data-reset="post" title="Reset post selector">\u21ba</button>
    </div>
    <div class="ais-cfg-row">
      <label>Comments</label>
      <input type="text" id="ais-cfg-comments" placeholder="CSS selector">
      <button id="ais-pick-comments" title="Pick element">\u22b9</button>
      <button class="ais-cfg-field-reset" data-reset="comments" title="Reset comments selector">\u21ba</button>
    </div>
    <div class="ais-cfg-row" style="align-items:flex-start">
      <label style="margin-top:4px">System</label>
      <textarea id="ais-cfg-system" placeholder="System prompt" rows="3"></textarea>
      <button class="ais-cfg-field-reset" data-reset="system" title="Reset prompt to default">\u21ba</button>
    </div>
    <div class="ais-cfg-row">
      <label>Provider</label>
      <select id="ais-cfg-provider">
        ${Object.entries(PROVIDERS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join('')}
      </select>
      <button class="ais-cfg-field-reset" data-reset="provider" title="Reset provider">\u21ba</button>
    </div>
    <div class="ais-cfg-row" id="ais-cfg-custom-row" style="display:none">
      <label>API URL</label>
      <input type="text" id="ais-cfg-api" placeholder="http://localhost:PORT/v1">
      <button class="ais-cfg-field-reset" data-reset="api" title="Reset API URL">\u21ba</button>
    </div>
    <div class="ais-cfg-row">
      <label>API Key</label>
      <input type="password" id="ais-cfg-apikey" placeholder="(optional)">
      <button class="ais-cfg-field-reset" data-reset="apikey" title="Clear API key">\u21ba</button>
    </div>
    <div class="ais-cfg-row">
      <label>Model</label>
      <select id="ais-cfg-model">
        <option value="">(auto / first available)</option>
      </select>
      <select id="ais-cfg-model-suffix" style="width:80px;flex:none" title="Thinking level">
        <option value="">none</option>
        <option value="(low)">low</option>
        <option value="(medium)">medium</option>
        <option value="(high)">high</option>
        <option value="(max)">max</option>
      </select>
      <button id="ais-cfg-refresh-models" title="Refresh models">&#x21bb;</button>
      <button class="ais-cfg-field-reset" data-reset="model" title="Reset model">\u21ba</button>
    </div>
    <div class="ais-cfg-row">
      <label title="Max output tokens">Tokens</label>
      <input type="text" id="ais-cfg-tokens" style="width:70px;flex:none">
      <label style="width:auto;margin-left:8px" title="Max input chars">Chars</label>
      <input type="text" id="ais-cfg-chars" style="width:70px;flex:none">
      <span id="ais-cfg-usage" style="color:#616384;font-size:10px;margin-left:4px;white-space:nowrap"></span>
      <button class="ais-cfg-field-reset" data-reset="tokens" title="Reset tokens/chars">\u21ba</button>
    </div>
    <div class="ais-cfg-btns">
      <div style="display:flex;gap:4px"><button id="ais-cfg-import">Import</button><button id="ais-cfg-export">Export</button></div>
      <div style="display:flex;gap:4px"><button id="ais-cfg-reset">Reset</button><button id="ais-cfg-save">Save</button></div>
    </div>
    <div id="ais-hidden-section" style="margin-top:8px;border-top:1px solid #333;padding-top:6px">
      <details id="ais-hidden-details">
        <summary>Hidden domains</summary>
        <div id="ais-hidden-list" style="margin-top:4px"></div>
      </details>
    </div>`;

  const pickerHighlight = mk('div', { id: 'ais-picker-hl' });
  const pickerBar = mk('div', { id: 'ais-picker-bar' });
  pickerBar.innerHTML = '<span class="ais-picker-label"></span><span class="ais-picker-sel"></span><div class="ais-picker-list"></div><button class="ais-picker-done">Done</button><button class="ais-picker-cancel">Cancel</button>';

  header.append(opacitySlider, autoLabel, gearBtn, closeBtn);
  panel.append(resize, header, settingsDiv, body);
  btnWrap.append(btn, copySumBtn, regenBtn, copyBtn, hideBtn);
  uiRoot.append(panel, btnWrap, pickerHighlight, pickerBar);
  document.body.appendChild(uiHost);

  initPicker(pickerHighlight, pickerBar, async (target, combined) => {
    const config = (await getSiteConfigs())[location.hostname] || { post: '', comments: '' };
    config[target] = combined;
    await saveSiteConfig(location.hostname, config);
    await updateSettingsInputs();
    highlightExtracted();
  });

  // --- title ---
  async function updateTitle() {
    const model = await cfg('ais-model');
    const provider = PROVIDERS[await cfg('ais-provider')]?.label || 'Custom';
    $('ais-title').textContent = model ? `${model} (${provider})` : provider;
  }

  await fetchModels(updateTitle);

  // --- panel state ---
  const savedW = await storage.get('ais-panel-width', null);
  if (savedW) panel.style.width = savedW + 'px';
  const getPanelWidth = () => panel.getBoundingClientRect().width || window.innerWidth * 0.5;
  const isVisible = () => panel.style.display === 'flex';

  // --- resize ---
  let resizing = false;
  resize.addEventListener('mousedown', e => { resizing = true; e.preventDefault(); });
  document.addEventListener('mousemove', e => {
    if (!resizing) return;
    panel.style.width = Math.max(220, Math.min(window.innerWidth - e.clientX, window.innerWidth * 0.8)) + 'px';
  });
  document.addEventListener('mouseup', () => {
    if (resizing) storage.set('ais-panel-width', Math.round(getPanelWidth()));
    resizing = false;
  });
  window.addEventListener('resize', () => {
    if (getPanelWidth() > window.innerWidth * 0.8) {
      panel.style.width = '50vw';
      storage.set('ais-panel-width', null);
    }
  });

  // --- copy ---
  copyBtn.addEventListener('click', async () => {
    await highlightExtracted();
    const text = await extractContent();
    if (!text) return;
    navigator.clipboard.writeText(`Page: ${document.title}\n\n${text}`).then(() => flashBtn(copyBtn, 'Copied!', 'Copy'));
  });

  // --- toggle / summarize ---
  let hasSummarized = false;
  let cachedResponse = null;
  let activeReq = null;
  let activeRevealTimer = null;

  const showPanel = () => {
    panel.style.display = 'flex';
    panel.style.opacity = opacitySlider.value / 100;
    requestAnimationFrame(() => panel.classList.add('ais-open'));
    copySumBtn.style.display = '';
    if (hasSummarized) regenBtn.style.display = '';
  };
  const hidePanel = () => {
    panel.classList.remove('ais-open');
    copySumBtn.style.display = 'none';
    regenBtn.style.display = 'none';
    setTimeout(() => { if (!panel.classList.contains('ais-open')) panel.style.display = 'none'; }, 250);
  };
  const closePanel = () => {
    if (activeReq) { activeReq.abort(); activeReq = null; }
    clearTimeout(activeRevealTimer);
    activeRevealTimer = null;
    hidePanel();
    clearHighlights();
    btn.textContent = 'Summarize';
  };

  closeBtn.addEventListener('click', closePanel);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && isVisible()) closePanel(); });
  document.addEventListener('mousedown', e => {
    if (isPickerActive()) return;
    if (isVisible() && !uiHost.contains(e.target)) closePanel();
  });

  copySumBtn.addEventListener('click', () => {
    const text = body.innerText?.trim();
    if (text) navigator.clipboard.writeText(text).then(() => flashBtn(copySumBtn, 'Copied!', 'Copy Summary'));
  });

  let extracting = false;
  let lastInputChars = 0;
  let lastUsage = null;

  async function runSummary() {
    clearTimeout(activeRevealTimer);
    activeRevealTimer = null;
    if (activeReq || extracting) return;
    extracting = true;
    await highlightExtracted();
    const text = await extractContent();
    extracting = false;
    if (!text) { body.textContent = 'No content found.'; return; }

    cachedResponse = null;
    const model = await getFullModel(availableModels);
    const suffix = (await cfg('ais-provider')) === 'cliproxyapi' ? await cfg('ais-model-suffix') : '';
    body.innerHTML = '';
    const statusEl = mk('div', { className: 'ais-status' });
    statusEl.textContent = suffix ? `Thinking (${suffix.replace(/[()]/g, '')})` : 'Processing';
    body.appendChild(statusEl);

    let full = '', thinkBuf = '', inThinking = false;

    const baseUrl = await getBaseUrl();
    const headers = await getAuthHeaders();
    const system = await cfg('ais-system-prompt');
    const maxTokens = await cfgInt('ais-max-tokens');
    const maxChars = await cfgInt('ais-max-chars');

    const content = `[Instructions]: ${system}\n\nPage: ${document.title.slice(0, 500)}\n\n${text.slice(0, maxChars)}`;
    lastInputChars = content.length;

    const reqBody = JSON.stringify({
      model,
      messages: [{ role: 'user', content }],
      max_tokens: maxTokens,
      stream: true,
    });

    activeReq = http.stream(baseUrl + '/chat/completions', headers, reqBody, {
      onDelta({ thinking, content }) {
        if (thinking) { thinkBuf += thinking; inThinking = true; }
        if (content) {
          if (inThinking) { full += `<think>${thinkBuf}</think>\n`; thinkBuf = ''; inThinking = false; }
          full += content;
        }
        const display = inThinking ? `<think>${thinkBuf}</think>` : full;
        if (display && !activeRevealTimer) {
          activeRevealTimer = setTimeout(() => {
            activeRevealTimer = null;
            body.replaceChildren(renderResponse(display));
          }, 50);
        }
      },
      onDone(usage) {
        clearTimeout(activeRevealTimer);
        activeRevealTimer = null;
        activeReq = null;
        hasSummarized = true;
        lastUsage = usage || null;
        regenBtn.style.display = '';
        if (inThinking) { full += `<think>${thinkBuf}</think>`; thinkBuf = ''; inThinking = false; }
        if (full) {
          cachedResponse = full;
          body.replaceChildren(renderResponse(full, true));
        } else {
          body.textContent = 'Empty response.';
        }
      },
      onError(msg) {
        clearTimeout(activeRevealTimer);
        activeRevealTimer = null;
        activeReq = null;
        hasSummarized = true;
        regenBtn.style.display = '';
        body.textContent = msg || 'Failed to reach API';
      },
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
    if (cachedResponse) body.replaceChildren(renderResponse(cachedResponse, true));
    else runSummary();
  });

  // --- settings ---
  function updateThinkingSuffix() {
    const suffix = $('ais-cfg-model-suffix');
    const provider = $('ais-cfg-provider').value;
    const name = $('ais-cfg-model').value || availableModels[0] || '';
    const enabled = provider === 'cliproxyapi' && modelSupportsThinking(name);
    suffix.disabled = !enabled;
    if (!enabled) suffix.value = '';
  }

  function populateModelDropdown() {
    const sel = $('ais-cfg-model');
    const cur = sel.dataset.current || '';
    sel.innerHTML = '';
    sel.appendChild(mk('option', { value: '', textContent: '(auto / first available)' }));
    for (const id of availableModels) {
      const opt = mk('option', { value: id, textContent: id });
      if (id === cur) opt.selected = true;
      sel.appendChild(opt);
    }
    updateThinkingSuffix();
  }

  async function renderHiddenDomains() {
    const list = $('ais-hidden-list');
    const hidden = await getHiddenDomains();
    const domains = Object.keys(hidden);
    if (!domains.length) {
      list.innerHTML = '<span style="color:#555;font-size:10px">None</span>';
      return;
    }
    list.innerHTML = '';
    for (const domain of domains.sort()) {
      const row = mk('div', { className: 'ais-hidden-row' });
      const label = mk('span', { textContent: domain });
      const unhide = mk('button', { textContent: 'Unhide', className: 'ais-cfg-field-reset' });
      unhide.addEventListener('click', async () => {
        const d = await getHiddenDomains();
        delete d[domain];
        await setHiddenDomains(d);
        renderHiddenDomains();
      });
      row.append(label, unhide);
      list.appendChild(row);
    }
  }

  async function updateSettingsInputs() {
    const config = await getActiveConfig();
    $('ais-cfg-host').textContent = location.hostname;
    $('ais-cfg-post').value = config.post || '';
    $('ais-cfg-comments').value = config.comments || '';
    $('ais-cfg-source').textContent = `(${config.source})`;
    $('ais-cfg-system').value = await cfg('ais-system-prompt');
    $('ais-cfg-provider').value = await cfg('ais-provider');
    $('ais-cfg-api').value = await storage.get('ais-custom-url', '');
    $('ais-cfg-apikey').value = await cfg('ais-api-key');
    $('ais-cfg-tokens').value = await cfgInt('ais-max-tokens');
    $('ais-cfg-chars').value = await cfgInt('ais-max-chars');
    const usageEl = $('ais-cfg-usage');
    if (lastUsage) {
      const pt = lastUsage.prompt_tokens?.toLocaleString() || '?';
      const ct = lastUsage.completion_tokens?.toLocaleString() || '?';
      usageEl.textContent = `${pt} in / ${ct} out tokens`;
    } else if (lastInputChars) {
      usageEl.textContent = `${lastInputChars.toLocaleString()} chars sent`;
    } else {
      usageEl.textContent = '';
    }
    $('ais-cfg-custom-row').style.display = (await cfg('ais-provider')) === 'custom' ? '' : 'none';
    $('ais-cfg-model-suffix').value = await cfg('ais-model-suffix');
    const model = await cfg('ais-model');
    $('ais-cfg-model').dataset.current = model;
    populateModelDropdown();
    renderHiddenDomains();
  }

  gearBtn.addEventListener('click', () => {
    settingsDiv.classList.toggle('ais-cfg-open');
    if (settingsDiv.classList.contains('ais-cfg-open')) updateSettingsInputs();
  });

  $('ais-pick-post').addEventListener('click', () => startPicker('post'));
  $('ais-pick-comments').addEventListener('click', () => startPicker('comments'));

  $('ais-cfg-provider').addEventListener('change', async (e) => {
    const p = e.target.value;
    $('ais-cfg-custom-row').style.display = p === 'custom' ? '' : 'none';
    const previewUrl = (p === 'custom'
      ? $('ais-cfg-api').value.trim().replace(/\/+$/, '')
      : PROVIDERS[p]?.url || PROVIDERS[DEFAULTS['ais-provider']].url
    ) + '/models';
    await fetchModels(populateModelDropdown, previewUrl);
  });

  $('ais-cfg-model').addEventListener('change', updateThinkingSuffix);

  $('ais-cfg-refresh-models').addEventListener('click', async (e) => {
    const b = e.currentTarget;
    b.textContent = '...';
    await fetchModels(() => { populateModelDropdown(); b.textContent = '\u21bb'; });
  });

  $('ais-cfg-save').addEventListener('click', async (e) => {
    await saveSiteConfig(location.hostname, {
      post: $('ais-cfg-post').value.trim(),
      comments: $('ais-cfg-comments').value.trim(),
    });
    await storage.set('ais-system-prompt', $('ais-cfg-system').value.trim() || DEFAULTS['ais-system-prompt']);
    await storage.set('ais-provider', $('ais-cfg-provider').value);
    await storage.set('ais-custom-url', $('ais-cfg-api').value.trim());
    await storage.set('ais-api-key', $('ais-cfg-apikey').value.trim());
    await storage.set('ais-model', $('ais-cfg-model').value);
    await storage.set('ais-model-suffix', $('ais-cfg-model-suffix').value.trim());
    await storage.set('ais-max-tokens', parseInt($('ais-cfg-tokens').value, 10) || DEFAULTS['ais-max-tokens']);
    await storage.set('ais-max-chars', parseInt($('ais-cfg-chars').value, 10) || DEFAULTS['ais-max-chars']);
    cachedResponse = null;
    await highlightExtracted();
    await updateTitle();
    flashBtn(e.currentTarget, 'Saved!', 'Save');
  });

  $('ais-cfg-reset').addEventListener('click', async () => {
    await deleteSiteConfig(location.hostname);
    await storage.set('ais-system-prompt', DEFAULTS['ais-system-prompt']);
    await storage.set('ais-provider', DEFAULTS['ais-provider']);
    await storage.set('ais-custom-url', '');
    await storage.set('ais-api-key', '');
    await storage.set('ais-model', DEFAULTS['ais-model']);
    await storage.set('ais-model-suffix', '');
    await storage.set('ais-max-tokens', DEFAULTS['ais-max-tokens']);
    await storage.set('ais-max-chars', DEFAULTS['ais-max-chars']);
    await updateSettingsInputs();
    await updateTitle();
    await highlightExtracted();
    cachedResponse = null;
    await fetchModels(populateModelDropdown);
    flashBtn($('ais-cfg-reset'), 'Done!', 'Reset');
  });

  for (const resetBtn of settingsDiv.querySelectorAll('.ais-cfg-field-reset')) {
    resetBtn.addEventListener('click', async () => {
      const field = resetBtn.dataset.reset;
      if (!field) return;
      if (field === 'post' || field === 'comments') {
        const c = (await getSiteConfigs())[location.hostname];
        if (c) { c[field] = ''; await saveSiteConfig(location.hostname, c); }
        $(`ais-cfg-${field}`).value = '';
      } else if (field === 'system') {
        await storage.set('ais-system-prompt', DEFAULTS['ais-system-prompt']);
        $('ais-cfg-system').value = DEFAULTS['ais-system-prompt'];
      } else if (field === 'provider') {
        await storage.set('ais-provider', DEFAULTS['ais-provider']);
        $('ais-cfg-provider').value = DEFAULTS['ais-provider'];
        $('ais-cfg-custom-row').style.display = 'none';
        await fetchModels(populateModelDropdown);
      } else if (field === 'api') {
        await storage.set('ais-custom-url', '');
        $('ais-cfg-api').value = '';
      } else if (field === 'apikey') {
        await storage.set('ais-api-key', '');
        $('ais-cfg-apikey').value = '';
      } else if (field === 'model') {
        await storage.set('ais-model', DEFAULTS['ais-model']);
        await storage.set('ais-model-suffix', '');
        $('ais-cfg-model').value = '';
        $('ais-cfg-model-suffix').value = '';
        updateThinkingSuffix();
      } else if (field === 'tokens') {
        await storage.set('ais-max-tokens', DEFAULTS['ais-max-tokens']);
        await storage.set('ais-max-chars', DEFAULTS['ais-max-chars']);
        $('ais-cfg-tokens').value = DEFAULTS['ais-max-tokens'];
        $('ais-cfg-chars').value = DEFAULTS['ais-max-chars'];
      }
      flashBtn(resetBtn, '\u2713', '\u21ba');
    });
  }

  $('ais-cfg-export').addEventListener('click', async () => {
    const data = JSON.stringify({
      siteConfigs: { ...DEFAULTS['ais-site-configs'], ...(await getSiteConfigs()) },
      autoSummarize: await storage.get('ais-auto-summarize-sites', {}),
      hiddenDomains: await getHiddenDomains(),
      systemPrompt: await cfg('ais-system-prompt'),
      provider: await cfg('ais-provider'),
      customUrl: await storage.get('ais-custom-url', ''),
      apiKey: (await cfg('ais-api-key')) ? '***' : '',
      model: await cfg('ais-model'),
      modelSuffix: await cfg('ais-model-suffix'),
      maxTokens: await cfgInt('ais-max-tokens'),
      maxChars: await cfgInt('ais-max-chars'),
    }, null, 2);
    const url = URL.createObjectURL(new Blob([data], { type: 'application/json' }));
    const a = mk('a', { href: url, download: 'ais-settings.json' });
    a.click();
    URL.revokeObjectURL(url);
  });

  $('ais-cfg-import').addEventListener('click', () => {
    const input = mk('input', { type: 'file', accept: '.json' });
    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const d = JSON.parse(reader.result);
          if (typeof d !== 'object' || d === null) throw new Error('Invalid');
          if (d.siteConfigs) {
            await storage.set('ais-site-configs', { ...(await getSiteConfigs()), ...d.siteConfigs });
            if (d.autoSummarize) await storage.set('ais-auto-summarize-sites', { ...(await storage.get('ais-auto-summarize-sites', {})), ...d.autoSummarize });
            if (d.hiddenDomains) await setHiddenDomains({ ...(await getHiddenDomains()), ...d.hiddenDomains });
            if (typeof d.systemPrompt === 'string') await storage.set('ais-system-prompt', d.systemPrompt);
            if (typeof d.provider === 'string' && d.provider in PROVIDERS) await storage.set('ais-provider', d.provider);
            if (typeof d.customUrl === 'string') await storage.set('ais-custom-url', d.customUrl);
            if (typeof d.apiKey === 'string' && d.apiKey !== '***') await storage.set('ais-api-key', d.apiKey);
            if (typeof d.model === 'string') await storage.set('ais-model', d.model);
            if (typeof d.modelSuffix === 'string') await storage.set('ais-model-suffix', d.modelSuffix);
            if (typeof d.maxTokens === 'number' && d.maxTokens > 0) await storage.set('ais-max-tokens', d.maxTokens);
            if (typeof d.maxChars === 'number' && d.maxChars > 0) await storage.set('ais-max-chars', d.maxChars);
          } else {
            await storage.set('ais-site-configs', { ...(await getSiteConfigs()), ...d });
          }
          autoCheck.checked = await getAutoSummarize(location.hostname);
          await updateSettingsInputs();
          const b = $('ais-cfg-import');
          b.style.background = '#4caf50';
          flashBtn(b, 'Imported!', 'Import');
          setTimeout(() => { b.style.background = ''; }, 1500);
        } catch { alert('Invalid JSON file'); }
      };
      reader.readAsText(file);
    });
    input.click();
  });

  // --- hide domain ---
  hideBtn.addEventListener('click', async () => {
    const d = await getHiddenDomains();
    d[location.hostname] = true;
    await setHiddenDomains(d);
    closePanel();
    uiHost.remove();
  });

  // --- clear highlights on interaction ---
  function onPageInteraction(e) {
    if (!hasHighlights() || isVisible()) return;
    if (e && uiHost.contains(e.target)) return;
    clearHighlights();
  }
  window.addEventListener('scroll', onPageInteraction, { passive: true });
  document.addEventListener('click', onPageInteraction);
  document.addEventListener('keydown', onPageInteraction);

  // --- auto-summarize ---
  autoCheck.checked = await getAutoSummarize(location.hostname);
  autoCheck.addEventListener('change', () => setAutoSummarize(location.hostname, autoCheck.checked));

  if (autoCheck.checked) {
    const trigger = () => setTimeout(() => {
      if (!isVisible() && !activeReq) {
        showPanel();
        btn.textContent = 'Close';
        runSummary();
      }
    }, 3000);
    if (document.readyState === 'complete') trigger();
    else window.addEventListener('load', trigger);
  }

  // extension icon click support
  if (options.onToggleMessage) {
    options.onToggleMessage(() => {
      if (isVisible()) { closePanel(); }
      else {
        showPanel();
        btn.textContent = 'Close';
        if (cachedResponse) body.replaceChildren(renderResponse(cachedResponse, true));
        else runSummary();
      }
    });
  }
}
