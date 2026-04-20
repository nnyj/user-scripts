import { generateSelector } from './detect.js';

let active = false;
let target = null;
let hovered = null;
let depthStack = [];
let selectors = [];
let highlightEl = null;
let barEl = null;
let onCommit = null;

function updateHighlight() {
  if (!hovered || !highlightEl) return;
  const rect = hovered.getBoundingClientRect();
  Object.assign(highlightEl.style, {
    display: 'block',
    top: rect.top + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
  });
  const sel = generateSelector(hovered);
  const count = document.querySelectorAll(sel).length;
  const already = selectors.includes(sel) ? ' \u2713' : '';
  barEl.querySelector('.ais-picker-sel').textContent = `${sel} (${count} match${count !== 1 ? 'es' : ''})${already}`;
}

function renderTags() {
  const list = barEl.querySelector('.ais-picker-list');
  list.innerHTML = '';
  for (const sel of selectors) {
    const tag = document.createElement('span');
    tag.className = 'ais-picker-tag';
    const count = document.querySelectorAll(sel).length;
    tag.textContent = `${sel} (${count})`;
    const x = document.createElement('span');
    x.className = 'ais-picker-tag-x';
    x.textContent = '\u00d7';
    x.addEventListener('click', () => {
      selectors.splice(selectors.indexOf(sel), 1);
      renderTags();
    });
    tag.appendChild(x);
    list.appendChild(tag);
  }
  barEl.querySelector('.ais-picker-done').style.display = selectors.length ? '' : 'none';
}

function onMove(e) {
  const el = e.target;
  if (!el || el.closest?.('#ais-host')) return;
  hovered = el;
  depthStack = [];
  updateHighlight();
}

function onClick(e) {
  if (e.composedPath().some(el => el === barEl)) return;
  e.preventDefault();
  e.stopPropagation();
  if (!hovered) return;
  const sel = generateSelector(hovered);
  const idx = selectors.indexOf(sel);
  if (idx >= 0) selectors.splice(idx, 1);
  else selectors.push(sel);
  renderTags();
}

function onKeydown(e) {
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); stop(); return; }
  if (e.key === 'Enter' && selectors.length) { e.preventDefault(); e.stopPropagation(); commit(); return; }
  if (e.key === 'ArrowUp' && hovered?.parentElement && hovered.parentElement !== document.body && hovered.parentElement !== document.documentElement) {
    e.preventDefault();
    depthStack.push(hovered);
    hovered = hovered.parentElement;
    updateHighlight();
  }
  if (e.key === 'ArrowDown' && depthStack.length) {
    e.preventDefault();
    hovered = depthStack.pop();
    updateHighlight();
  }
}

function commit() {
  if (!selectors.length) return;
  const combined = selectors.join(', ');
  if (onCommit) onCommit(target, combined);
  stop();
}

function stop() {
  active = false;
  hovered = null;
  depthStack = [];
  selectors = [];
  document.body.style.cursor = '';
  if (highlightEl) highlightEl.style.display = 'none';
  if (barEl) barEl.style.display = 'none';
  document.removeEventListener('mousemove', onMove, true);
  document.removeEventListener('click', onClick, true);
  document.removeEventListener('keydown', onKeydown, true);
}

export function initPicker(highlight, bar, commitCb) {
  highlightEl = highlight;
  barEl = bar;
  onCommit = commitCb;
  bar.querySelector('.ais-picker-done').addEventListener('click', commit);
  bar.querySelector('.ais-picker-cancel').addEventListener('click', stop);
}

export function startPicker(which) {
  target = which;
  active = true;
  selectors = [];
  document.body.style.cursor = 'crosshair';
  barEl.style.display = 'flex';
  barEl.querySelector('.ais-picker-done').style.display = 'none';
  barEl.querySelector('.ais-picker-list').innerHTML = '';
  barEl.querySelector('.ais-picker-label').textContent = `Pick ${which} elements \u2014 click to add/remove \u2014 \u2191\u2193 depth \u2014 Enter done \u2014 Esc cancel`;
  document.addEventListener('mousemove', onMove, true);
  document.addEventListener('click', onClick, true);
  document.addEventListener('keydown', onKeydown, true);
}

export function isPickerActive() {
  return active;
}
