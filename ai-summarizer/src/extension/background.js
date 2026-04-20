chrome.runtime.onConnect.addListener(port => {
  if (port.name !== 'ais-stream') return;

  let controller = null;

  port.onDisconnect.addListener(() => { controller?.abort(); });

  port.onMessage.addListener(async msg => {
    if (msg.action === 'abort') { controller?.abort(); return; }
    if (msg.action !== 'stream') return;

    controller = new AbortController();

    try {
      const res = await fetch(msg.url, {
        method: 'POST',
        headers: msg.headers,
        body: msg.body,
        signal: controller.signal,
      });

      if (!res.ok) {
        let detail;
        try { detail = await res.text(); } catch { detail = res.statusText; }
        try { port.postMessage({ type: 'error', message: `${res.status} \u2014 ${detail}` }); } catch {}
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let usage = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith('data: ')) continue;
          const data = trimmed.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.usage) usage = parsed.usage;
            const delta = parsed.choices?.[0]?.delta;
            if (!delta) continue;
            const thinking = delta.reasoning_content || delta.reasoning || '';
            const content = delta.content || '';
            if (thinking || content) {
              try { port.postMessage({ type: 'delta', thinking, content }); } catch {}
            }
          } catch {}
        }
      }

      try { port.postMessage({ type: 'done', usage }); } catch {}
    } catch (e) {
      if (e.name !== 'AbortError') {
        try { port.postMessage({ type: 'error', message: e.message }); } catch {}
      }
    }
  });
});

chrome.action.onClicked.addListener(tab => {
  if (tab.id) chrome.tabs.sendMessage(tab.id, { action: 'toggle' }).catch(() => {});
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg.action !== 'fetch') return;
  fetch(msg.url, msg.options || {})
    .then(r => r.json())
    .then(data => sendResponse({ ok: true, data }))
    .catch(e => sendResponse({ ok: false, error: e.message }));
  return true;
});
