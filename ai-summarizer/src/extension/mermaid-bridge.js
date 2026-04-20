// MAIN world content script — loads mermaid on demand, renders via DOM events
(async () => {
  let loaded = false;

  async function ensureMermaid() {
    if (loaded) return;
    const extUrl = document.documentElement.dataset.aisExtUrl;
    if (!extUrl) throw new Error('Extension URL not set');
    await new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = extUrl + 'mermaid-vendor.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Failed to load mermaid'));
      document.head.appendChild(s);
    });
    window.__aisMermaid.initialize({ startOnLoad: false, theme: 'dark', securityLevel: 'strict' });
    loaded = true;
  }

  let counter = 0;
  const offscreen = document.createElement('div');
  offscreen.style.cssText = 'position:fixed;top:-9999px;left:-9999px;visibility:hidden;';

  document.addEventListener('ais-mermaid-render', async (e) => {
    let parsed;
    try { parsed = JSON.parse(e.detail); } catch { return; }
    const { id, code } = parsed;
    if (id === undefined || !code) return;
    try {
      await ensureMermaid();
      if (!offscreen.parentNode) document.body.appendChild(offscreen);
      const renderId = 'ais-mmd-' + (counter++);
      const { svg } = await window.__aisMermaid.render(renderId, code, offscreen);
      document.dispatchEvent(new CustomEvent('ais-mermaid-result', {
        detail: JSON.stringify({ id, svg }),
      }));
    } catch (err) {
      document.dispatchEvent(new CustomEvent('ais-mermaid-result', {
        detail: JSON.stringify({ id, error: err.message }),
      }));
    }
  });
})();
