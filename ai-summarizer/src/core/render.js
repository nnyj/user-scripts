import DOMPurify from 'dompurify';
import { marked } from 'marked';

const BAR_COLORS = ['#4caf50', '#2196f3', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4', '#ff5722', '#8bc34a'];
let barColorIdx = 0;

function renderBars(html) {
  barColorIdx = 0;
  return html.replace(/\[bar:(\d+)\/(\d+)\s+([^\]]+)\]/g, (_, val, max, label) => {
    const maxN = parseInt(max) || 1;
    const pct = Math.min(100, Math.round((parseInt(val) / maxN) * 100));
    const color = BAR_COLORS[barColorIdx++ % BAR_COLORS.length];
    return `<div class="ais-bar">
      <span class="ais-bar-label">${DOMPurify.sanitize(label)}</span>
      <div class="ais-bar-track"><div class="ais-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="ais-bar-value">${val}/${max}</span>
    </div>`;
  });
}

let mermaidMod = null;
let mermaidReady = false;
let externalRenderer = null;

export function registerMermaidRenderer(fn) {
  externalRenderer = fn;
  mermaidReady = true;
}

export async function initMermaid() {
  if (externalRenderer) { mermaidReady = true; return; }
  try {
    mermaidMod = (await import('mermaid')).default;
    mermaidMod.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
    mermaidReady = true;
    console.debug('[AIS] mermaid ready');
  } catch (e) {
    console.warn('[AIS] mermaid direct import unavailable:', e.message);
  }
}

let mermaidStash = {};
let mermaidGeneration = 0;

// stash completed mermaid fences, leave incomplete ones for marked to render as code
let stashCounter = 0;
function stashMermaidBlocks(text) {
  const stash = (_, code) => {
    const id = `MERMAID_${mermaidGeneration}_${stashCounter++}`;
    mermaidStash[id] = code.trim();
    return `\n${id}\n`;
  };
  text = text.replace(/```mermaid\s*\n([\s\S]*?)```/g, stash);
  text = text.replace(/```\s*\n(((?:pie|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|journey|gitGraph|mindmap|timeline|quadrantChart|sankey|xychart|block)\b[\s\S]*?))```/g, stash);
  return text;
}

function unstashMermaidPlaceholders(container) {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const replacements = [];
  while (walker.nextNode()) {
    const match = walker.currentNode.textContent.match(/MERMAID_\d+_\d+/);
    if (match && mermaidStash[match[0]]) {
      replacements.push({ node: walker.currentNode, id: match[0] });
    }
  }
  for (const { node, id } of replacements) {
    const code = mermaidStash[id];
    if (mermaidReady) {
      const div = document.createElement('div');
      div.className = 'ais-mermaid';
      div.dataset.mermaidId = id;
      div.textContent = 'Rendering diagram...';
      node.parentNode.replaceChild(div, node);
    } else {
      const pre = document.createElement('pre');
      const codeEl = document.createElement('code');
      codeEl.textContent = code;
      pre.appendChild(codeEl);
      node.parentNode.replaceChild(pre, node);
      delete mermaidStash[id];
    }
  }
  return replacements.length > 0 && mermaidReady;
}

const SANITIZE_SVG = { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ['foreignObject', 'style'] };

async function renderMermaidInBody(container, gen) {
  if (!mermaidReady) return;
  const holders = container.querySelectorAll('.ais-mermaid[data-mermaid-id]');
  if (!holders.length) return;

  let renderFn, offscreen;
  if (externalRenderer) {
    renderFn = (code) => externalRenderer(code);
  } else if (mermaidMod) {
    offscreen = document.createElement('div');
    offscreen.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;';
    document.body.appendChild(offscreen);
    renderFn = async (code, stashId) => {
      const renderId = 'ais-mmd-' + stashId.replace(/[^a-zA-Z0-9]/g, '-');
      return (await mermaidMod.render(renderId, code, offscreen)).svg;
    };
  } else return;

  const stripEmoji = (s) => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, '').replace(/ {2,}/g, ' ');

  for (const el of holders) {
    if (gen !== mermaidGeneration) break;
    const stashId = el.dataset.mermaidId;
    const code = mermaidStash[stashId];
    if (!code) continue;
    try {
      const svg = await renderFn(code, stashId);
      if (gen !== mermaidGeneration) break;
      el.innerHTML = DOMPurify.sanitize(svg, SANITIZE_SVG);
    } catch (firstErr) {
      const cleaned = stripEmoji(code);
      if (cleaned !== code) {
        try {
          const svg = await renderFn(cleaned, stashId + '-retry');
          if (gen !== mermaidGeneration) break;
          el.innerHTML = DOMPurify.sanitize(svg, SANITIZE_SVG);
          continue;
        } catch {}
      }
      el.innerHTML = '';
      const err = document.createElement('div');
      err.textContent = 'Diagram error: ' + firstErr.message;
      err.style.cssText = 'color:#e57373;font-size:11px;margin-bottom:6px';
      const pre = document.createElement('pre');
      pre.textContent = code;
      pre.style.cssText = 'text-align:left;color:#818384;font-size:11px;white-space:pre-wrap;margin:0';
      el.append(err, pre);
    }
    el.removeAttribute('data-mermaid-id');
    delete mermaidStash[stashId];
  }
  offscreen?.remove();
}

function parseMarkdownInHtmlBlocks(text) {
  return text.replace(
    /(<details>\s*<summary>)([\s\S]*?)(<\/summary>)([\s\S]*?)(<\/details>)/gi,
    (_, open, summary, midClose, content, close) => {
      const parsedSummary = marked.parseInline(summary.trim());
      const parsedContent = marked.parse(content.trim());
      return `${open}${parsedSummary}${midClose}\n${parsedContent}\n${close}`;
    }
  );
}

export function renderResponse(text, final = false) {
  mermaidStash = {};
  stashCounter = 0;
  const gen = ++mermaidGeneration;
  text = text.replace(/<\/?think(?:ing)?>/gi, m => {
    const isOpen = !m.startsWith('</');
    return isOpen ? '\x00THINK_OPEN\x00' : '\x00THINK_CLOSE\x00';
  });
  let depth = 0, cleaned = '';
  for (const part of text.split('\x00')) {
    if (part === 'THINK_OPEN') { if (depth === 0) cleaned += '<think>'; depth++; }
    else if (part === 'THINK_CLOSE') { depth = Math.max(0, depth - 1); if (depth === 0) cleaned += '</think>'; }
    else cleaned += part;
  }
  if (depth > 0) cleaned += '</think>';
  text = cleaned;

  const container = document.createElement('div');
  const parts = [];
  const re = /<think>([\s\S]*?)<\/think>/gi;
  let last = 0, m;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push({ type: 'text', body: text.slice(last, m.index) });
    parts.push({ type: 'think', body: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: 'text', body: text.slice(last) });

  for (const part of parts) {
    let body = part.body;
    body = parseMarkdownInHtmlBlocks(body);
    const stashed = stashMermaidBlocks(body);
    let html = DOMPurify.sanitize(marked.parse(stashed), { ADD_TAGS: ['details', 'summary'], ADD_ATTR: ['open', 'class'] });
    html = renderBars(html);
    if (part.type === 'text') {
      const div = document.createElement('div');
      div.innerHTML = html;
      container.appendChild(div);
    } else {
      const details = document.createElement('details');
      details.open = true;
      const summary = document.createElement('summary');
      const inner = document.createElement('div');
      summary.textContent = 'Thinking...';
      inner.className = 'think-body';
      inner.innerHTML = html;
      details.append(summary, inner);
      container.appendChild(details);
    }
  }

  container.querySelectorAll('details').forEach(d => d.open = true);

  const shouldRender = unstashMermaidPlaceholders(container);
  if (shouldRender) {
    renderMermaidInBody(container, gen);
  }

  return container;
}
