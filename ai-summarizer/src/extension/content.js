import { setup as setupStorage } from './storage.js';
import { setup as setupHttp } from './http.js';
import { registerMermaidRenderer } from '../core/render.js';
import { createUI } from '../core/ui.js';

setupStorage();
setupHttp();

document.documentElement.dataset.aisExtUrl = chrome.runtime.getURL('');

let pendingRequests = new Map();
let reqId = 0;

document.addEventListener('ais-mermaid-result', (e) => {
  try {
    const { id, svg, error } = JSON.parse(e.detail);
    const cb = pendingRequests.get(id);
    if (!cb) return;
    pendingRequests.delete(id);
    if (error) cb.reject(new Error(error));
    else cb.resolve(svg);
  } catch {}
});

registerMermaidRenderer(async (code) => {
  const id = reqId++;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pendingRequests.delete(id);
      reject(new Error('Mermaid render timed out'));
    }, 10000);
    pendingRequests.set(id, {
      resolve(svg) { clearTimeout(timer); resolve(svg); },
      reject(err) { clearTimeout(timer); reject(err); },
    });
    document.dispatchEvent(new CustomEvent('ais-mermaid-render', {
      detail: JSON.stringify({ id, code }),
    }));
  });
});

createUI({
  onToggleMessage: (cb) => {
    chrome.runtime.onMessage.addListener((msg) => {
      if (msg.action === 'toggle') cb();
    });
  },
});
