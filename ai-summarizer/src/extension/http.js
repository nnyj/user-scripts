import { init } from '../adapters/http.js';

export function setup() {
  init({
    stream: (url, headers, body, { onDelta, onDone, onError }) => {
      const port = chrome.runtime.connect({ name: 'ais-stream' });
      port.onMessage.addListener(msg => {
        if (msg.type === 'delta') {
          onDelta({ thinking: msg.thinking || '', content: msg.content || '' });
        } else if (msg.type === 'done') {
          onDone(msg.usage);
        } else if (msg.type === 'error') {
          onError(msg.message);
        }
      });
      port.onDisconnect.addListener(() => {});
      port.postMessage({ action: 'stream', url, headers, body });
      return {
        abort: () => {
          try { port.postMessage({ action: 'abort' }); } catch {}
          try { port.disconnect(); } catch {}
        },
      };
    },
    fetchJson: async (url, headers) => {
      return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage({ action: 'fetch', url, options: { headers } }, res => {
          if (chrome.runtime.lastError) return reject(new Error(chrome.runtime.lastError.message));
          if (res?.ok) resolve(res.data);
          else reject(new Error(res?.error || 'Fetch failed'));
        });
      });
    },
  });
}
