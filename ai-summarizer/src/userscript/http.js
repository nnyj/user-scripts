import { init } from '../adapters/http.js';

export function setup(GM_xmlhttpRequest) {
  init({
    stream: (url, headers, body, { onDelta, onDone, onError }) => {
      let lastLen = 0;
      let usage = null;
      const req = GM_xmlhttpRequest({
        method: 'POST',
        url,
        headers,
        data: body,
        onprogress(res) {
          const chunk = res.responseText.slice(lastLen);
          lastLen = res.responseText.length;
          for (const line of chunk.split('\n')) {
            const trimmed = line.trim();
            if (!trimmed.startsWith('data: ') || trimmed === 'data: [DONE]') continue;
            try {
              const parsed = JSON.parse(trimmed.slice(6));
              if (parsed.usage) usage = parsed.usage;
              const delta = parsed.choices?.[0]?.delta;
              if (!delta) continue;
              const thinking = delta.reasoning_content || delta.reasoning || '';
              const content = delta.content || '';
              if (thinking || content) onDelta({ thinking, content });
            } catch (e) { /* partial chunk */ }
          }
        },
        onload() { onDone(usage); },
        onerror() { onError('Failed to reach API'); },
        ontimeout() { onError('Request timed out'); },
        timeout: 120000,
      });
      return { abort: () => req.abort() };
    },
    fetchJson: async (url, headers) => {
      return new Promise((resolve, reject) => {
        GM_xmlhttpRequest({
          method: 'GET',
          url,
          headers,
          onload(res) {
            try { resolve(JSON.parse(res.responseText)); }
            catch (e) { reject(e); }
          },
          onerror() { reject(new Error('Fetch failed')); },
        });
      });
    },
  });
}
