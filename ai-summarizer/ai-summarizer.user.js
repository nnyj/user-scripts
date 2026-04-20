// ==UserScript==
// @name         AI Page Summarizer
// @version      2.0.0
// @description  Summarize any page using a local LLM (LMStudio, etc.)
// @namespace    https://github.com/nnyj/user-scripts
// @homepageURL  https://github.com/nnyj/user-scripts
// @updateURL    https://raw.githubusercontent.com/nnyj/user-scripts/main/ai-summarizer/ai-summarizer.user.js
// @downloadURL  https://raw.githubusercontent.com/nnyj/user-scripts/main/ai-summarizer/ai-summarizer.user.js
// @icon         data:image/svg+xml,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20viewBox%3D%220%200%2032%2032%22%3E%3Crect%20width%3D%2232%22%20height%3D%2232%22%20rx%3D%226%22%20fill%3D%22%231a1a1b%22%2F%3E%3Cpath%20d%3D%22M6%208h14M6%2013h20M6%2018h16M6%2023h12%22%20stroke%3D%22%23ff6b35%22%20stroke-width%3D%222.5%22%20stroke-linecap%3D%22round%22%2F%3E%3Ccircle%20cx%3D%2225%22%20cy%3D%2222%22%20r%3D%225.5%22%20fill%3D%22%23ff4500%22%2F%3E%3Cpath%20d%3D%22M23%2022l2%202%203-3.5%22%20stroke%3D%22%23fff%22%20stroke-width%3D%221.5%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20fill%3D%22none%22%2F%3E%3C%2Fsvg%3E
// @match        *://*/*
// @run-at       document-end
// @grant        GM_xmlhttpRequest
// @grant        GM_getValue
// @grant        GM_setValue
// @connect      localhost
// @require      https://cdn.jsdelivr.net/npm/mermaid@10.9.1/dist/mermaid.min.js
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @require      https://cdn.jsdelivr.net/npm/dompurify/dist/purify.min.js
// ==/UserScript==

(() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __esm = (fn, res) => function() {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  };
  var __export = (target2, all) => {
    for (var name in all)
      __defProp(target2, name, { get: all[name], enumerable: !0 });
  };

  // mermaid-cdn:mermaid
  var mermaid_exports = {};
  __export(mermaid_exports, {
    default: () => mermaid_default
  });
  var mod2, mermaid_default, init_mermaid = __esm({
    "mermaid-cdn:mermaid"() {
      mod2 = typeof mermaid < "u" ? mermaid : null, mermaid_default = mod2;
    }
  });

  // src/adapters/storage.js
  var _get, _set;
  function init(impl) {
    _get = impl.get, _set = impl.set;
  }
  async function get(key, defaultVal) {
    return await _get(key, defaultVal);
  }
  async function set(key, val) {
    return await _set(key, val);
  }

  // src/userscript/storage.js
  function setup(GM_getValue2, GM_setValue2) {
    init({
      get: async (key, defaultVal) => GM_getValue2(key, defaultVal),
      set: async (key, val) => GM_setValue2(key, val)
    });
  }

  // src/adapters/http.js
  var _stream, _fetchJson;
  function init2(impl) {
    _stream = impl.stream, _fetchJson = impl.fetchJson;
  }
  function stream(url, headers, body, callbacks) {
    return _stream(url, headers, body, callbacks);
  }
  async function fetchJson(url, headers) {
    return await _fetchJson(url, headers);
  }

  // src/userscript/http.js
  function setup2(GM_xmlhttpRequest2) {
    init2({
      stream: (url, headers, body, { onDelta, onDone, onError }) => {
        let lastLen = 0, usage = null, req = GM_xmlhttpRequest2({
          method: "POST",
          url,
          headers,
          data: body,
          onprogress(res) {
            let chunk = res.responseText.slice(lastLen);
            lastLen = res.responseText.length;
            for (let line of chunk.split(`
`)) {
              let trimmed = line.trim();
              if (!(!trimmed.startsWith("data: ") || trimmed === "data: [DONE]"))
                try {
                  let parsed = JSON.parse(trimmed.slice(6));
                  parsed.usage && (usage = parsed.usage);
                  let delta = parsed.choices?.[0]?.delta;
                  if (!delta) continue;
                  let thinking = delta.reasoning_content || delta.reasoning || "", content = delta.content || "";
                  (thinking || content) && onDelta({ thinking, content });
                } catch {
                }
            }
          },
          onload() {
            onDone(usage);
          },
          onerror() {
            onError("Failed to reach API");
          },
          ontimeout() {
            onError("Request timed out");
          },
          timeout: 12e4
        });
        return { abort: () => req.abort() };
      },
      fetchJson: async (url, headers) => new Promise((resolve, reject) => {
        GM_xmlhttpRequest2({
          method: "GET",
          url,
          headers,
          onload(res) {
            try {
              resolve(JSON.parse(res.responseText));
            } catch (e) {
              reject(e);
            }
          },
          onerror() {
            reject(new Error("Fetch failed"));
          }
        });
      })
    });
  }

  // src/core/config.js
  var PROVIDERS = {
    llamacpp: { label: "llama.cpp", url: "http://localhost:8080/v1" },
    lmstudio: { label: "LMStudio", url: "http://localhost:1234/v1" },
    cliproxyapi: { label: "CLIProxyAPI", url: "http://localhost:8317/v1" },
    custom: { label: "Custom", url: "" }
  }, DEFAULTS = {
    "ais-provider": "llamacpp",
    "ais-model": "",
    "ais-model-suffix": "",
    "ais-max-tokens": 32e3,
    "ais-max-chars": 2e5,
    "ais-custom-url": "",
    "ais-api-key": "",
    "ais-opacity": 80,
    "ais-panel-width": null,
    "ais-site-configs": {},
    "ais-auto-summarize-sites": {},
    "ais-hidden-domains": {},
    "ais-system-prompt": [
      "You are a subagent. Summarize this content for Opus to use in a coding task.",
      "Extract key insights. Use emoji, bullet, tables for readability.",
      "Categories use emoji too.",
      "",
      "Visual features (use when they aid comprehension):",
      "- TL;DR: Start with `> **TL;DR:** one-sentence takeaway` blockquote at top.",
      "- Sentiment bars: `[bar:N/M label]` where N=value, M=max. e.g. `[bar:8/10 Codex instruction following]`",
      "- Mermaid diagrams: use ```mermaid fences. Good diagram types:",
      "  - `mindmap` for topic clustering / concept maps",
      "  - `flowchart` for decisions, processes, relationships",
      "  - `sequenceDiagram` for interactions between systems/people",
      "  - `pie` for sentiment/opinion distribution",
      "  - `timeline` for chronological content",
      "  Always include 1-2 diagram types that best fit content.",
      "",
      "Tally repeats/sentiments: \u{1F525} after points (\u{1F525}=3-4, \u{1F525}\u{1F525}=5-7, \u{1F525}\u{1F525}\u{1F525}=8+).",
      "Style:",
      "- Drop articles, filler, pleasantries, hedging",
      "- Fragments fine. Short synonyms. Technical terms stay exact.",
      "- Pattern: [thing] [action] [reason].",
      "- ## headings + --- separators for grouped content.",
      "- Use collapsible sections: `<details><summary>Section title</summary>content</details>` for secondary detail."
    ].join(`
`)
  }, SITE_CONFIGS = {
    "old.reddit.com": { post: ".thing.link .usertext-body .md", comments: ".comment .usertext-body .md" },
    "news.ycombinator.com": { post: "", comments: ".commtext" },
    "lobste.rs": { post: ".story_text", comments: ".comment_text" },
    lemmy: { post: ".post-listing .md, .post-content", comments: ".comment .md" },
    "tildes.net": { post: ".topic-text-original", comments: ".comment-text" },
    "stackexchange.com": { post: ".question .s-prose", comments: ".answer .s-prose" },
    "stackoverflow.com": { post: ".question .s-prose", comments: ".answer .s-prose" }
  }, NO_THINKING = /haiku|gpt-3|gpt-4o-mini/i;
  function modelSupportsThinking(name) {
    return name && !NO_THINKING.test(name);
  }

  // src/core/styles.js
  var STYLES = `
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
  #ais-opacity { width: 80px; height: 4px; cursor: pointer; accent-color: #818384; margin: 0; }
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
  #ais-body { padding: 12px 12px 60px; overflow-y: auto; flex: 1; }
  .ais-status { color: #818384; font-size: 13px; }
  .ais-status::after {
    content: '';
    animation: ais-dots 1.4s steps(4, end) infinite;
  }
  @keyframes ais-dots {
    0% { content: ''; }
    25% { content: '.'; }
    50% { content: '..'; }
    75% { content: '...'; }
  }
  #ais-body :is(h1,h2,h3) { color: #e8eaed; margin: 12px 0 6px; font-size: 14px; border-bottom: 1px solid #333; padding-bottom: 4px; }
  #ais-body h1 { font-size: 16px; color: #fff; }
  #ais-body :is(ul,ol) { padding-left: 18px; margin: 4px 0; }
  #ais-body li { margin: 3px 0; line-height: 1.5; }
  #ais-body p { margin: 4px 0; }
  #ais-body strong { color: #fff; }
  #ais-body a { color: #0079d3; }
  #ais-body code { background: #272729; padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  #ais-body pre code { display: block; padding: 8px; }
  #ais-body details summary { cursor: pointer; color: #818384; font-size: 11px; margin: 6px 0 2px; list-style: none; }
  #ais-body details summary::before { content: '\\25b6 '; }
  #ais-body details[open] summary::before { content: '\\25bc '; }
  .think-body { color: #818384; font-size: 11px; border-left: 2px solid #333; padding-left: 8px; margin: 2px 0; }
  #ais-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; border-radius: 4px; overflow: hidden; }
  #ais-body th, #ais-body td { border: 1px solid #383838; padding: 6px 10px; text-align: left; }
  #ais-body th { background: linear-gradient(#2a2a2c, #222224); color: #e8eaed; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  #ais-body tr:nth-child(even) { background: #1e1e1f; }
  #ais-body tr:hover { background: #2a2a2c; }
  #ais-body blockquote { border-left: 3px solid #0079d3; margin: 6px 0; padding: 2px 10px; color: #999; background: #1e1e1f; border-radius: 0 4px 4px 0; }
  #ais-body blockquote:first-child { border-left: 3px solid #ff6b35; background: linear-gradient(135deg, #2a1a0e, #1e1e1f); padding: 8px 12px; margin-bottom: 12px; }
  #ais-body blockquote:first-child strong { color: #ff6b35; }
  .ais-bar { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 12px; }
  .ais-bar-label { width: 180px; color: #d7dadc; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
  .ais-bar-track { flex: 1; height: 14px; background: #2a2a2c; border-radius: 3px; overflow: hidden; min-width: 80px; }
  .ais-bar-fill { height: 100%; border-radius: 3px; transition: width .3s ease; }
  .ais-bar-value { color: #818384; font-size: 11px; white-space: nowrap; flex-shrink: 0; }
  .ais-mermaid { background: #222; border-radius: 6px; padding: 12px; margin: 8px 0; overflow-x: auto; text-align: center; }
  .ais-mermaid svg { max-width: 100%; height: auto; }
  #ais-body hr { border: none; border-top: 1px solid #333; margin: 12px 0; }
  #ais-body img { max-width: 100%; border-radius: 4px; margin: 4px 0; }
  #ais-btns {
    position: fixed; bottom: 20px; right: 0; z-index: 2147483647;
    display: flex; gap: 5px; flex-direction: row-reverse;
    padding: 8px 12px 8px 14px;
    background: rgba(25, 25, 27, 0.75);
    backdrop-filter: blur(12px);
    border-radius: 10px 0 0 10px;
    border-left: 3px solid rgba(255, 69, 0, 0.5);
    transform: translateX(calc(100% - 14px));
    transition: transform .3s cubic-bezier(.4,0,.2,1);
  }
  #ais-btns:hover { transform: translateX(0); }
  #ais-btns button {
    padding: 7px 12px; color: #fff; border: none; border-radius: 6px;
    cursor: pointer; font: bold 12px system-ui,sans-serif;
    box-shadow: 0 1px 4px rgba(0,0,0,.3);
    transition: background .15s, transform .1s;
  }
  #ais-btns button:hover { transform: scale(1.05); }
  #ais-btn { background: linear-gradient(135deg, #ff4500, #ff6b35); }
  #ais-btn:hover { background: linear-gradient(135deg, #e03d00, #ff5722); }
  #ais-hide { background: rgba(255,255,255,0.1); font-size: 16px; padding: 7px 9px; line-height: 1; }
  #ais-hide:hover { background: rgba(200,0,0,0.6); }
  #ais-copy-sum { background: linear-gradient(135deg, #0079d3, #00a8ff); }
  #ais-copy-sum:hover { background: linear-gradient(135deg, #0063ad, #0090e0); }
  #ais-copy-btn, #ais-regen { background: linear-gradient(135deg, #5f6368, #787c80); }
  #ais-copy-btn:hover, #ais-regen:hover { background: linear-gradient(135deg, #4a4f53, #6a6e72); }
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
  .ais-cfg-row input[type="text"], .ais-cfg-row select, .ais-cfg-row textarea {
    flex: 1; min-width: 0; background: #1a1a1b; border: 1px solid #333;
    color: #d7dadc; padding: 2px 6px; border-radius: 3px; font: 11px monospace;
  }
  .ais-cfg-row textarea { padding: 4px 6px; font: 12px/1.4 monospace; resize: vertical; min-height: 40px; }
  .ais-cfg-row button, .ais-cfg-btns button {
    background: #5f6368; color: #fff; border: none; padding: 2px 8px;
    border-radius: 3px; cursor: pointer; font-size: 10px; white-space: nowrap;
  }
  .ais-cfg-row button:hover, .ais-cfg-btns button:hover { filter: brightness(1.2); }
  .ais-cfg-row select:disabled { opacity: 0.35; cursor: not-allowed; }
  .ais-cfg-btns { display: flex; gap: 4px; justify-content: space-between; margin-top: 6px; }
  #ais-cfg-save { background: #2e7d32; }
  #ais-cfg-reset { background: #c62828; }
  .ais-cfg-field-reset { font-size: 9px !important; padding: 1px 4px !important; opacity: 0.5; }
  .ais-cfg-field-reset:hover { opacity: 1 !important; }
  #ais-cfg-source { color: #616384; font-size: 10px; font-style: italic; }
  .ais-hidden-row { display: flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 3px; }
  .ais-hidden-row:nth-child(even) { background: #1e1e1f; }
  .ais-hidden-row:hover { background: #2a2a2c; }
  .ais-hidden-row span { color: #d7dadc; font-size: 11px; flex: 1; }
  #ais-hidden-details > summary { color: #818384; font-size: 11px; cursor: pointer; list-style: none; user-select: none; }
  #ais-hidden-details > summary::before { content: '\\25b6 '; }
  #ais-hidden-details[open] > summary::before { content: '\\25bc '; }
  #ais-picker-hl {
    position: fixed; z-index: 2147483645; pointer-events: none; display: none;
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
    color: #818384; flex: none; font: 11px monospace;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ais-picker-done {
    background: #2e7d32; color: #fff; border: none; padding: 4px 12px;
    border-radius: 4px; cursor: pointer; font-size: 11px;
  }
  .ais-picker-cancel {
    background: #5f6368; color: #fff; border: none; padding: 4px 12px;
    border-radius: 4px; cursor: pointer; font-size: 11px;
  }
  .ais-picker-done:hover, .ais-picker-cancel:hover { filter: brightness(1.2); }
  .ais-picker-list {
    flex: 1; display: flex; flex-wrap: wrap; gap: 4px; overflow: hidden;
  }
  .ais-picker-tag {
    background: #383838; color: #d7dadc; font: 11px monospace;
    padding: 2px 6px; border-radius: 3px; display: flex; align-items: center; gap: 4px;
  }
  .ais-picker-tag-x {
    cursor: pointer; color: #818384; font-size: 13px; line-height: 1;
  }
  .ais-picker-tag-x:hover { color: #ff4500; }
`;

  // dompurify-cdn:dompurify
  var mod = typeof DOMPurify < "u" ? DOMPurify : { sanitize: (t) => t }, dompurify_default = mod;

  // marked-cdn:marked
  var marked = typeof window < "u" && window.marked ? window.marked : { parse: (t) => t, parseInline: (t) => t };

  // src/core/render.js
  var BAR_COLORS = ["#4caf50", "#2196f3", "#ff9800", "#e91e63", "#9c27b0", "#00bcd4", "#ff5722", "#8bc34a"], barColorIdx = 0;
  function renderBars(html) {
    return barColorIdx = 0, html.replace(/\[bar:(\d+)\/(\d+)\s+([^\]]+)\]/g, (_, val, max, label) => {
      let maxN = parseInt(max) || 1, pct = Math.min(100, Math.round(parseInt(val) / maxN * 100)), color = BAR_COLORS[barColorIdx++ % BAR_COLORS.length];
      return `<div class="ais-bar">
      <span class="ais-bar-label">${dompurify_default.sanitize(label)}</span>
      <div class="ais-bar-track"><div class="ais-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <span class="ais-bar-value">${val}/${max}</span>
    </div>`;
    });
  }
  var mermaidMod = null, mermaidReady = !1, externalRenderer = null;
  async function initMermaid() {
    if (externalRenderer) {
      mermaidReady = !0;
      return;
    }
    try {
      mermaidMod = (await Promise.resolve().then(() => (init_mermaid(), mermaid_exports))).default, mermaidMod.initialize({ startOnLoad: !1, theme: "dark", securityLevel: "strict" }), mermaidReady = !0, console.debug("[AIS] mermaid ready");
    } catch (e) {
      console.warn("[AIS] mermaid direct import unavailable:", e.message);
    }
  }
  var mermaidStash = {}, mermaidGeneration = 0, stashCounter = 0;
  function stashMermaidBlocks(text) {
    let stash = (_, code) => {
      let id = `MERMAID_${mermaidGeneration}_${stashCounter++}`;
      return mermaidStash[id] = code.trim(), `
${id}
`;
    };
    return text = text.replace(/```mermaid\s*\n([\s\S]*?)```/g, stash), text = text.replace(/```\s*\n(((?:pie|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|journey|gitGraph|mindmap|timeline|quadrantChart|sankey|xychart|block)\b[\s\S]*?))```/g, stash), text;
  }
  function unstashMermaidPlaceholders(container) {
    let walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT), replacements = [];
    for (; walker.nextNode(); ) {
      let match = walker.currentNode.textContent.match(/MERMAID_\d+_\d+/);
      match && mermaidStash[match[0]] && replacements.push({ node: walker.currentNode, id: match[0] });
    }
    for (let { node, id } of replacements) {
      let code = mermaidStash[id];
      if (mermaidReady) {
        let div = document.createElement("div");
        div.className = "ais-mermaid", div.dataset.mermaidId = id, div.textContent = "Rendering diagram...", node.parentNode.replaceChild(div, node);
      } else {
        let pre = document.createElement("pre"), codeEl = document.createElement("code");
        codeEl.textContent = code, pre.appendChild(codeEl), node.parentNode.replaceChild(pre, node), delete mermaidStash[id];
      }
    }
    return replacements.length > 0 && mermaidReady;
  }
  var SANITIZE_SVG = { USE_PROFILES: { svg: !0, svgFilters: !0 }, ADD_TAGS: ["foreignObject", "style"] };
  async function renderMermaidInBody(container, gen) {
    if (!mermaidReady) return;
    let holders = container.querySelectorAll(".ais-mermaid[data-mermaid-id]");
    if (!holders.length) return;
    let renderFn, offscreen;
    if (externalRenderer)
      renderFn = (code) => externalRenderer(code);
    else if (mermaidMod)
      offscreen = document.createElement("div"), offscreen.style.cssText = "position:fixed;top:-9999px;left:-9999px;visibility:hidden;", document.body.appendChild(offscreen), renderFn = async (code, stashId) => {
        let renderId = "ais-mmd-" + stashId.replace(/[^a-zA-Z0-9]/g, "-");
        return (await mermaidMod.render(renderId, code, offscreen)).svg;
      };
    else return;
    let stripEmoji = (s) => s.replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{200D}\u{20E3}\u{E0020}-\u{E007F}]/gu, "").replace(/ {2,}/g, " ");
    for (let el of holders) {
      if (gen !== mermaidGeneration) break;
      let stashId = el.dataset.mermaidId, code = mermaidStash[stashId];
      if (code) {
        try {
          let svg = await renderFn(code, stashId);
          if (gen !== mermaidGeneration) break;
          el.innerHTML = dompurify_default.sanitize(svg, SANITIZE_SVG);
        } catch (firstErr) {
          let cleaned = stripEmoji(code);
          if (cleaned !== code)
            try {
              let svg = await renderFn(cleaned, stashId + "-retry");
              if (gen !== mermaidGeneration) break;
              el.innerHTML = dompurify_default.sanitize(svg, SANITIZE_SVG);
              continue;
            } catch {
            }
          el.innerHTML = "";
          let err = document.createElement("div");
          err.textContent = "Diagram error: " + firstErr.message, err.style.cssText = "color:#e57373;font-size:11px;margin-bottom:6px";
          let pre = document.createElement("pre");
          pre.textContent = code, pre.style.cssText = "text-align:left;color:#818384;font-size:11px;white-space:pre-wrap;margin:0", el.append(err, pre);
        }
        el.removeAttribute("data-mermaid-id"), delete mermaidStash[stashId];
      }
    }
    offscreen?.remove();
  }
  function parseMarkdownInHtmlBlocks(text) {
    return text.replace(
      /(<details>\s*<summary>)([\s\S]*?)(<\/summary>)([\s\S]*?)(<\/details>)/gi,
      (_, open, summary, midClose, content, close) => {
        let parsedSummary = marked.parseInline(summary.trim()), parsedContent = marked.parse(content.trim());
        return `${open}${parsedSummary}${midClose}
${parsedContent}
${close}`;
      }
    );
  }
  function renderResponse(text, final = !1) {
    mermaidStash = {}, stashCounter = 0;
    let gen = ++mermaidGeneration;
    text = text.replace(/<\/?think(?:ing)?>/gi, (m2) => !m2.startsWith("</") ? "\0THINK_OPEN\0" : "\0THINK_CLOSE\0");
    let depth = 0, cleaned = "";
    for (let part of text.split("\0"))
      part === "THINK_OPEN" ? (depth === 0 && (cleaned += "<think>"), depth++) : part === "THINK_CLOSE" ? (depth = Math.max(0, depth - 1), depth === 0 && (cleaned += "</think>")) : cleaned += part;
    depth > 0 && (cleaned += "</think>"), text = cleaned;
    let container = document.createElement("div"), parts = [], re = /<think>([\s\S]*?)<\/think>/gi, last = 0, m;
    for (; (m = re.exec(text)) !== null; )
      m.index > last && parts.push({ type: "text", body: text.slice(last, m.index) }), parts.push({ type: "think", body: m[1] }), last = m.index + m[0].length;
    last < text.length && parts.push({ type: "text", body: text.slice(last) });
    for (let part of parts) {
      let body = part.body;
      body = parseMarkdownInHtmlBlocks(body);
      let stashed = stashMermaidBlocks(body), html = dompurify_default.sanitize(marked.parse(stashed), { ADD_TAGS: ["details", "summary"], ADD_ATTR: ["open", "class"] });
      if (html = renderBars(html), part.type === "text") {
        let div = document.createElement("div");
        div.innerHTML = html, container.appendChild(div);
      } else {
        let details = document.createElement("details");
        details.open = !0;
        let summary = document.createElement("summary"), inner = document.createElement("div");
        summary.textContent = "Thinking...", inner.className = "think-body", inner.innerHTML = html, details.append(summary, inner), container.appendChild(details);
      }
    }
    return container.querySelectorAll("details").forEach((d) => d.open = !0), unstashMermaidPlaceholders(container) && renderMermaidInBody(container, gen), container;
  }

  // src/core/detect.js
  function generateSelector(el, depth = 0) {
    if (el.id) return "#" + CSS.escape(el.id);
    let tag = el.tagName.toLowerCase(), classes = [...el.classList].filter((c) => !/^(js-|ember-|react-|ng-|v-|_|active|hover|focus|selected|open|closed|visible|hidden|is-|has-)/.test(c) && c.length < 50).slice(0, 3).map((c) => "." + CSS.escape(c)).join(""), sel = classes ? tag + classes : tag;
    return depth < 10 && document.querySelectorAll(sel).length > 30 && el.parentElement && el.parentElement !== document.body ? generateSelector(el.parentElement, depth + 1) + " " + sel : sel;
  }
  function detectMainContent() {
    for (let sel of ["article", '[role="main"]', "main", "#content", ".content", ".post-body", ".entry-content", ".article-body", ".story-body"])
      if (document.querySelector(sel)?.innerText?.trim().length > 100) return sel;
    let best = null, bestScore = 0;
    for (let el of document.querySelectorAll("div, section")) {
      let text = el.innerText?.trim() || "";
      if (text.length < 200) continue;
      let ratio = text.length / (el.innerHTML?.length || 1), score = text.length * ratio;
      score > bestScore && (bestScore = score, best = el);
    }
    return best ? generateSelector(best) : null;
  }
  function detectComments() {
    let hints = ["comment", "reply", "response", "message", "discuss"], candidates = /* @__PURE__ */ new Map();
    for (let hint of hints)
      for (let el of document.querySelectorAll(`[class*="${hint}"]`)) {
        if ((el.innerText?.trim().length || 0) < 20) continue;
        let cls = [...el.classList].find((c) => c.toLowerCase().includes(hint));
        if (!cls) continue;
        let sel = "." + CSS.escape(cls), count = document.querySelectorAll(sel).length;
        count >= 2 && candidates.set(sel, count);
      }
    return candidates.size ? [...candidates.entries()].sort((a, b) => b[1] - a[1])[0][0] : null;
  }

  // src/core/picker.js
  var active = !1, target = null, hovered = null, depthStack = [], selectors = [], highlightEl = null, barEl = null, onCommit = null;
  function updateHighlight() {
    if (!hovered || !highlightEl) return;
    let rect = hovered.getBoundingClientRect();
    Object.assign(highlightEl.style, {
      display: "block",
      top: rect.top + "px",
      left: rect.left + "px",
      width: rect.width + "px",
      height: rect.height + "px"
    });
    let sel = generateSelector(hovered), count = document.querySelectorAll(sel).length, already = selectors.includes(sel) ? " \u2713" : "";
    barEl.querySelector(".ais-picker-sel").textContent = `${sel} (${count} match${count !== 1 ? "es" : ""})${already}`;
  }
  function renderTags() {
    let list = barEl.querySelector(".ais-picker-list");
    list.innerHTML = "";
    for (let sel of selectors) {
      let tag = document.createElement("span");
      tag.className = "ais-picker-tag";
      let count = document.querySelectorAll(sel).length;
      tag.textContent = `${sel} (${count})`;
      let x = document.createElement("span");
      x.className = "ais-picker-tag-x", x.textContent = "\xD7", x.addEventListener("click", () => {
        selectors.splice(selectors.indexOf(sel), 1), renderTags();
      }), tag.appendChild(x), list.appendChild(tag);
    }
    barEl.querySelector(".ais-picker-done").style.display = selectors.length ? "" : "none";
  }
  function onMove(e) {
    let el = e.target;
    !el || el.closest?.("#ais-host") || (hovered = el, depthStack = [], updateHighlight());
  }
  function onClick(e) {
    if (e.composedPath().some((el) => el === barEl) || (e.preventDefault(), e.stopPropagation(), !hovered)) return;
    let sel = generateSelector(hovered), idx = selectors.indexOf(sel);
    idx >= 0 ? selectors.splice(idx, 1) : selectors.push(sel), renderTags();
  }
  function onKeydown(e) {
    if (e.key === "Escape") {
      e.preventDefault(), e.stopPropagation(), stop();
      return;
    }
    if (e.key === "Enter" && selectors.length) {
      e.preventDefault(), e.stopPropagation(), commit();
      return;
    }
    e.key === "ArrowUp" && hovered?.parentElement && hovered.parentElement !== document.body && hovered.parentElement !== document.documentElement && (e.preventDefault(), depthStack.push(hovered), hovered = hovered.parentElement, updateHighlight()), e.key === "ArrowDown" && depthStack.length && (e.preventDefault(), hovered = depthStack.pop(), updateHighlight());
  }
  function commit() {
    if (!selectors.length) return;
    let combined = selectors.join(", ");
    onCommit && onCommit(target, combined), stop();
  }
  function stop() {
    active = !1, hovered = null, depthStack = [], selectors = [], document.body.style.cursor = "", highlightEl && (highlightEl.style.display = "none"), barEl && (barEl.style.display = "none"), document.removeEventListener("mousemove", onMove, !0), document.removeEventListener("click", onClick, !0), document.removeEventListener("keydown", onKeydown, !0);
  }
  function initPicker(highlight, bar, commitCb) {
    highlightEl = highlight, barEl = bar, onCommit = commitCb, bar.querySelector(".ais-picker-done").addEventListener("click", commit), bar.querySelector(".ais-picker-cancel").addEventListener("click", stop);
  }
  function startPicker(which) {
    target = which, active = !0, selectors = [], document.body.style.cursor = "crosshair", barEl.style.display = "flex", barEl.querySelector(".ais-picker-done").style.display = "none", barEl.querySelector(".ais-picker-list").innerHTML = "", barEl.querySelector(".ais-picker-label").textContent = `Pick ${which} elements \u2014 click to add/remove \u2014 \u2191\u2193 depth \u2014 Enter done \u2014 Esc cancel`, document.addEventListener("mousemove", onMove, !0), document.addEventListener("click", onClick, !0), document.addEventListener("keydown", onKeydown, !0);
  }
  function isPickerActive() {
    return active;
  }

  // src/core/extract.js
  function queryEls(sel) {
    try {
      return [...document.querySelectorAll(sel)].map((el) => el.innerText.trim()).filter((t) => t.length > 10);
    } catch (e) {
      return console.warn("[AIS] queryEls:", e), [];
    }
  }
  function joinSections(post, comments) {
    return [post, comments && `=== Comments ===

` + comments].filter(Boolean).join(`

`);
  }
  function isDiscourse() {
    return !!document.querySelector('meta[name="generator"][content^="Discourse"]') || !!document.querySelector(".discourse-root, #discourse-main") || document.body.classList.contains("discourse");
  }
  async function extractDiscourse() {
    try {
      let m = location.pathname.match(/\/t\/[^/]+\/(\d+)/);
      if (m) {
        let posts2 = (await (await fetch(`/t/${m[1]}.json`)).json()).post_stream?.posts?.map((p) => new DOMParser().parseFromString(p.cooked || "", "text/html").body.textContent.replace(/\s+/g, " ").trim()).filter((t) => t?.length > 10).slice(0, 100);
        if (posts2?.length) {
          let [first2, ...rest2] = posts2;
          return joinSections(first2, rest2.join(`
---
`));
        }
      }
    } catch (e) {
      console.warn("[AIS] extractDiscourse:", e);
    }
    let posts = queryEls(".topic-post .cooked, .post-stream .cooked");
    if (!posts.length) return "";
    let [first, ...rest] = posts;
    return joinSections(first, rest.join(`
---
`));
  }
  async function getSiteConfigs() {
    return await get("ais-site-configs", {});
  }
  async function saveSiteConfig(domain, config) {
    let all = await getSiteConfigs();
    all[domain] = config, await set("ais-site-configs", all);
  }
  async function deleteSiteConfig(domain) {
    let all = await getSiteConfigs();
    delete all[domain], await set("ais-site-configs", all);
  }
  async function getActiveConfig() {
    let host = location.hostname, saved = (await getSiteConfigs())[host];
    if (saved) return { ...saved, source: "saved" };
    for (let [domain, config] of Object.entries(SITE_CONFIGS))
      if (host === domain || host.endsWith("." + domain)) return { ...config, source: "default" };
    return isDiscourse() ? { post: "", comments: "", discourse: !0, source: "discourse" } : { post: detectMainContent(), comments: detectComments(), source: "auto" };
  }
  async function extractContent() {
    let config = await getActiveConfig();
    if (config.discourse) {
      let r = await extractDiscourse();
      if (r) return r;
    }
    let post = config.post && queryEls(config.post)[0] || "", comments = config.comments ? queryEls(config.comments).join(`
---
`) : "", result = joinSections(post, comments);
    return result || [...document.querySelectorAll("p")].map((p) => p.innerText.trim()).filter((t) => t.length > 40).join(`

`);
  }
  async function getAutoSummarize(host) {
    return !!(await get("ais-auto-summarize-sites", {}))[host];
  }
  async function setAutoSummarize(host, val) {
    let all = await get("ais-auto-summarize-sites", {});
    val ? all[host] = !0 : delete all[host], await set("ais-auto-summarize-sites", all);
  }
  async function getHiddenDomains() {
    return await get("ais-hidden-domains", {});
  }
  async function setHiddenDomains(d) {
    await set("ais-hidden-domains", d);
  }
  var highlightedEls = [];
  function clearHighlights() {
    for (let { el, prev } of highlightedEls)
      el.style.backgroundColor = prev || "", el.style.transition = "";
    highlightedEls = [];
  }
  async function highlightExtracted() {
    clearHighlights();
    let config = await getActiveConfig(), sels = [config.post, config.comments].filter(Boolean), els = [];
    for (let s of sels)
      try {
        document.querySelectorAll(s).forEach((el) => els.push(el));
      } catch {
      }
    for (let el of els)
      highlightedEls.push({ el, prev: el.style.backgroundColor }), el.style.transition = "background-color 0.3s", el.style.backgroundColor = "rgba(255, 255, 0, 0.2)";
  }
  function hasHighlights() {
    return highlightedEls.length > 0;
  }

  // src/core/ui.js
  var mk = (tag, props) => Object.assign(document.createElement(tag), props);
  function flashBtn(btn, text, restore) {
    btn && (btn.textContent = text, setTimeout(() => {
      btn.textContent = restore;
    }, 1500));
  }
  var cfg = (key) => get(key, DEFAULTS[key]), cfgInt = async (key) => Math.max(1, parseInt(await cfg(key), 10) || DEFAULTS[key]);
  async function getBaseUrl() {
    let p = await cfg("ais-provider");
    return p === "custom" ? (await get("ais-custom-url", "")).replace(/\/+$/, "") : PROVIDERS[p]?.url || PROVIDERS[DEFAULTS["ais-provider"]].url;
  }
  async function getAuthHeaders() {
    let h = { "Content-Type": "application/json" }, k = await cfg("ais-api-key");
    return k && (h.Authorization = `Bearer ${k}`), h;
  }
  async function getFullModel(available) {
    let p = await cfg("ais-provider"), explicit = await cfg("ais-model");
    if (p === "lmstudio") return explicit || "";
    let m = explicit || available?.[0] || "default";
    if (p === "cliproxyapi") {
      let s = await cfg("ais-model-suffix");
      return s ? m + s : m;
    }
    return m;
  }
  var availableModels = [];
  async function fetchModels(cb, overrideUrl) {
    let url = overrideUrl || await getBaseUrl() + "/models";
    try {
      availableModels = ((await fetchJson(url, await getAuthHeaders())).data || []).map((m) => m.id).sort();
    } catch {
      availableModels = [];
    }
    cb && cb();
  }
  async function createUI(options = {}) {
    if (window.innerWidth < 400 || window.innerHeight < 300 || document.querySelector("#challenge-running, #challenge-stage, .cf-browser-verification, #turnstile-wrapper") || document.title === "Just a moment..." || (await getHiddenDomains())[location.hostname]) return;
    initMermaid();
    let uiHost = mk("div", { id: "ais-host" });
    uiHost.style.cssText = "all: initial; position: static;";
    let uiRoot = uiHost.attachShadow({ mode: "open" });
    uiRoot.appendChild(mk("style", { textContent: STYLES }));
    let $ = (id) => uiRoot.getElementById(id), panel = mk("div", { id: "ais-panel" }), resize = mk("div", { id: "ais-resize" }), header = mk("div", { id: "ais-header", innerHTML: '<span id="ais-title"></span>' }), opacityVal = await get("ais-opacity", DEFAULTS["ais-opacity"]), opacitySlider = mk("input", { id: "ais-opacity", type: "range", min: 20, max: 100, value: opacityVal }), closeBtn = mk("span", { id: "ais-close", textContent: "\xD7" }), body = mk("div", { id: "ais-body" }), btnWrap = mk("div", { id: "ais-btns" }), btn = mk("button", { id: "ais-btn", textContent: "Summarize" }), copyBtn = mk("button", { id: "ais-copy-btn", textContent: "Copy" }), copySumBtn = mk("button", { id: "ais-copy-sum", textContent: "Copy Summary", style: "display:none" }), regenBtn = mk("button", { id: "ais-regen", textContent: "Regenerate", style: "display:none" }), hideBtn = mk("button", { id: "ais-hide", textContent: "\xD7", title: `Hide on ${location.hostname}` }), autoLabel = mk("label", { id: "ais-auto-label" }), autoCheck = mk("input", { type: "checkbox" });
    autoLabel.append(autoCheck, "Auto-summarize"), opacitySlider.addEventListener("input", () => {
      panel.style.opacity = opacitySlider.value / 100, set("ais-opacity", Number(opacitySlider.value));
    });
    let gearBtn = mk("span", { id: "ais-gear", textContent: "\u2699", title: "Site selectors" }), settingsDiv = mk("div", { id: "ais-settings" });
    settingsDiv.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
      <span>Site: <b id="ais-cfg-host" style="color:#d7dadc"></b> <span id="ais-cfg-source"></span></span>
    </div>
    <div class="ais-cfg-row">
      <label>Post</label>
      <input type="text" id="ais-cfg-post" placeholder="CSS selector">
      <button id="ais-pick-post" title="Pick element">\u22B9</button>
      <button class="ais-cfg-field-reset" data-reset="post" title="Reset post selector">\u21BA</button>
    </div>
    <div class="ais-cfg-row">
      <label>Comments</label>
      <input type="text" id="ais-cfg-comments" placeholder="CSS selector">
      <button id="ais-pick-comments" title="Pick element">\u22B9</button>
      <button class="ais-cfg-field-reset" data-reset="comments" title="Reset comments selector">\u21BA</button>
    </div>
    <div class="ais-cfg-row" style="align-items:flex-start">
      <label style="margin-top:4px">System</label>
      <textarea id="ais-cfg-system" placeholder="System prompt" rows="3"></textarea>
      <button class="ais-cfg-field-reset" data-reset="system" title="Reset prompt to default">\u21BA</button>
    </div>
    <div class="ais-cfg-row">
      <label>Provider</label>
      <select id="ais-cfg-provider">
        ${Object.entries(PROVIDERS).map(([k, v]) => `<option value="${k}">${v.label}</option>`).join("")}
      </select>
      <button class="ais-cfg-field-reset" data-reset="provider" title="Reset provider">\u21BA</button>
    </div>
    <div class="ais-cfg-row" id="ais-cfg-custom-row" style="display:none">
      <label>API URL</label>
      <input type="text" id="ais-cfg-api" placeholder="http://localhost:PORT/v1">
      <button class="ais-cfg-field-reset" data-reset="api" title="Reset API URL">\u21BA</button>
    </div>
    <div class="ais-cfg-row">
      <label>API Key</label>
      <input type="password" id="ais-cfg-apikey" placeholder="(optional)">
      <button class="ais-cfg-field-reset" data-reset="apikey" title="Clear API key">\u21BA</button>
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
      <button class="ais-cfg-field-reset" data-reset="model" title="Reset model">\u21BA</button>
    </div>
    <div class="ais-cfg-row">
      <label title="Max output tokens">Tokens</label>
      <input type="text" id="ais-cfg-tokens" style="width:70px;flex:none">
      <label style="width:auto;margin-left:8px" title="Max input chars">Chars</label>
      <input type="text" id="ais-cfg-chars" style="width:70px;flex:none">
      <span id="ais-cfg-usage" style="color:#616384;font-size:10px;margin-left:4px;white-space:nowrap"></span>
      <button class="ais-cfg-field-reset" data-reset="tokens" title="Reset tokens/chars">\u21BA</button>
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
    let pickerHighlight = mk("div", { id: "ais-picker-hl" }), pickerBar = mk("div", { id: "ais-picker-bar" });
    pickerBar.innerHTML = '<span class="ais-picker-label"></span><span class="ais-picker-sel"></span><div class="ais-picker-list"></div><button class="ais-picker-done">Done</button><button class="ais-picker-cancel">Cancel</button>', header.append(opacitySlider, autoLabel, gearBtn, closeBtn), panel.append(resize, header, settingsDiv, body), btnWrap.append(btn, copySumBtn, regenBtn, copyBtn, hideBtn), uiRoot.append(panel, btnWrap, pickerHighlight, pickerBar), document.body.appendChild(uiHost), initPicker(pickerHighlight, pickerBar, async (target2, combined) => {
      let config = (await getSiteConfigs())[location.hostname] || { post: "", comments: "" };
      config[target2] = combined, await saveSiteConfig(location.hostname, config), await updateSettingsInputs(), highlightExtracted();
    });
    async function updateTitle() {
      let model = await cfg("ais-model"), provider = PROVIDERS[await cfg("ais-provider")]?.label || "Custom";
      $("ais-title").textContent = model ? `${model} (${provider})` : provider;
    }
    await fetchModels(updateTitle);
    let savedW = await get("ais-panel-width", null);
    savedW && (panel.style.width = savedW + "px");
    let getPanelWidth = () => panel.getBoundingClientRect().width || window.innerWidth * 0.5, isVisible = () => panel.style.display === "flex", resizing = !1;
    resize.addEventListener("mousedown", (e) => {
      resizing = !0, e.preventDefault();
    }), document.addEventListener("mousemove", (e) => {
      resizing && (panel.style.width = Math.max(220, Math.min(window.innerWidth - e.clientX, window.innerWidth * 0.8)) + "px");
    }), document.addEventListener("mouseup", () => {
      resizing && set("ais-panel-width", Math.round(getPanelWidth())), resizing = !1;
    }), window.addEventListener("resize", () => {
      getPanelWidth() > window.innerWidth * 0.8 && (panel.style.width = "50vw", set("ais-panel-width", null));
    }), copyBtn.addEventListener("click", async () => {
      await highlightExtracted();
      let text = await extractContent();
      text && navigator.clipboard.writeText(`Page: ${document.title}

${text}`).then(() => flashBtn(copyBtn, "Copied!", "Copy"));
    });
    let hasSummarized = !1, cachedResponse = null, activeReq = null, activeRevealTimer = null, showPanel = () => {
      panel.style.display = "flex", panel.style.opacity = opacitySlider.value / 100, requestAnimationFrame(() => panel.classList.add("ais-open")), copySumBtn.style.display = "", hasSummarized && (regenBtn.style.display = "");
    }, hidePanel = () => {
      panel.classList.remove("ais-open"), copySumBtn.style.display = "none", regenBtn.style.display = "none", setTimeout(() => {
        panel.classList.contains("ais-open") || (panel.style.display = "none");
      }, 250);
    }, closePanel = () => {
      activeReq && (activeReq.abort(), activeReq = null), clearTimeout(activeRevealTimer), activeRevealTimer = null, hidePanel(), clearHighlights(), btn.textContent = "Summarize";
    };
    closeBtn.addEventListener("click", closePanel), document.addEventListener("keydown", (e) => {
      e.key === "Escape" && isVisible() && closePanel();
    }), document.addEventListener("mousedown", (e) => {
      isPickerActive() || isVisible() && !uiHost.contains(e.target) && closePanel();
    }), copySumBtn.addEventListener("click", () => {
      let text = body.innerText?.trim();
      text && navigator.clipboard.writeText(text).then(() => flashBtn(copySumBtn, "Copied!", "Copy Summary"));
    });
    let extracting = !1, lastInputChars = 0, lastUsage = null;
    async function runSummary() {
      if (clearTimeout(activeRevealTimer), activeRevealTimer = null, activeReq || extracting) return;
      extracting = !0, await highlightExtracted();
      let text = await extractContent();
      if (extracting = !1, !text) {
        body.textContent = "No content found.";
        return;
      }
      cachedResponse = null;
      let model = await getFullModel(availableModels), suffix = await cfg("ais-provider") === "cliproxyapi" ? await cfg("ais-model-suffix") : "";
      body.innerHTML = "";
      let statusEl = mk("div", { className: "ais-status" });
      statusEl.textContent = suffix ? `Thinking (${suffix.replace(/[()]/g, "")})` : "Processing", body.appendChild(statusEl);
      let contentBuf = "", thinkBuf = "", seenContent = !1, baseUrl = await getBaseUrl(), headers = await getAuthHeaders(), system = await cfg("ais-system-prompt"), maxTokens = await cfgInt("ais-max-tokens"), maxChars = await cfgInt("ais-max-chars"), content = `[Instructions]: ${system}

Page: ${document.title.slice(0, 500)}

${text.slice(0, maxChars)}`;
      lastInputChars = content.length;
      let compose = () => (thinkBuf ? `<think>${thinkBuf}</think>
` : "") + contentBuf, reqBody = JSON.stringify({
        model,
        messages: [{ role: "user", content }],
        max_tokens: maxTokens,
        stream: !0
      });
      activeReq = stream(baseUrl + "/chat/completions", headers, reqBody, {
        onDelta({ thinking, content: content2 }) {
          thinking && (seenContent ? contentBuf += thinking : thinkBuf += thinking), content2 && (seenContent = !0, contentBuf += content2);
          let display = compose();
          display && !activeRevealTimer && (activeRevealTimer = setTimeout(() => {
            activeRevealTimer = null, body.replaceChildren(renderResponse(display));
          }, 50));
        },
        onDone(usage) {
          clearTimeout(activeRevealTimer), activeRevealTimer = null, activeReq = null, hasSummarized = !0, lastUsage = usage || null, regenBtn.style.display = "";
          let full = compose();
          full ? (cachedResponse = full, body.replaceChildren(renderResponse(full, !0))) : body.textContent = "Empty response.";
        },
        onError(msg) {
          clearTimeout(activeRevealTimer), activeRevealTimer = null, activeReq = null, hasSummarized = !0, regenBtn.style.display = "", body.textContent = msg || "Failed to reach API";
        }
      });
    }
    regenBtn.addEventListener("click", () => {
      activeReq && (activeReq.abort(), activeReq = null), runSummary();
    }), btn.addEventListener("click", () => {
      if (isVisible()) {
        closePanel();
        return;
      }
      showPanel(), btn.textContent = "Close", cachedResponse ? body.replaceChildren(renderResponse(cachedResponse, !0)) : runSummary();
    });
    function updateThinkingSuffix() {
      let suffix = $("ais-cfg-model-suffix"), provider = $("ais-cfg-provider").value, name = $("ais-cfg-model").value || availableModels[0] || "", enabled = provider === "cliproxyapi" && modelSupportsThinking(name);
      suffix.disabled = !enabled, enabled || (suffix.value = "");
    }
    function populateModelDropdown() {
      let sel = $("ais-cfg-model"), cur = sel.dataset.current || "";
      sel.innerHTML = "", sel.appendChild(mk("option", { value: "", textContent: "(auto / first available)" }));
      for (let id of availableModels) {
        let opt = mk("option", { value: id, textContent: id });
        id === cur && (opt.selected = !0), sel.appendChild(opt);
      }
      updateThinkingSuffix();
    }
    async function renderHiddenDomains() {
      let list = $("ais-hidden-list"), hidden2 = await getHiddenDomains(), domains = Object.keys(hidden2);
      if (!domains.length) {
        list.innerHTML = '<span style="color:#555;font-size:10px">None</span>';
        return;
      }
      list.innerHTML = "";
      for (let domain of domains.sort()) {
        let row = mk("div", { className: "ais-hidden-row" }), label = mk("span", { textContent: domain }), unhide = mk("button", { textContent: "Unhide", className: "ais-cfg-field-reset" });
        unhide.addEventListener("click", async () => {
          let d = await getHiddenDomains();
          delete d[domain], await setHiddenDomains(d), renderHiddenDomains();
        }), row.append(label, unhide), list.appendChild(row);
      }
    }
    async function updateSettingsInputs() {
      let config = await getActiveConfig();
      $("ais-cfg-host").textContent = location.hostname, $("ais-cfg-post").value = config.post || "", $("ais-cfg-comments").value = config.comments || "", $("ais-cfg-source").textContent = `(${config.source})`, $("ais-cfg-system").value = await cfg("ais-system-prompt"), $("ais-cfg-provider").value = await cfg("ais-provider"), $("ais-cfg-api").value = await get("ais-custom-url", ""), $("ais-cfg-apikey").value = await cfg("ais-api-key"), $("ais-cfg-tokens").value = await cfgInt("ais-max-tokens"), $("ais-cfg-chars").value = await cfgInt("ais-max-chars");
      let usageEl = $("ais-cfg-usage");
      if (lastUsage) {
        let pt = lastUsage.prompt_tokens?.toLocaleString() || "?", ct = lastUsage.completion_tokens?.toLocaleString() || "?";
        usageEl.textContent = `${pt} in / ${ct} out tokens`;
      } else lastInputChars ? usageEl.textContent = `${lastInputChars.toLocaleString()} chars sent` : usageEl.textContent = "";
      $("ais-cfg-custom-row").style.display = await cfg("ais-provider") === "custom" ? "" : "none", $("ais-cfg-model-suffix").value = await cfg("ais-model-suffix");
      let model = await cfg("ais-model");
      $("ais-cfg-model").dataset.current = model, populateModelDropdown(), renderHiddenDomains();
    }
    gearBtn.addEventListener("click", () => {
      settingsDiv.classList.toggle("ais-cfg-open"), settingsDiv.classList.contains("ais-cfg-open") && updateSettingsInputs();
    }), $("ais-pick-post").addEventListener("click", () => startPicker("post")), $("ais-pick-comments").addEventListener("click", () => startPicker("comments")), $("ais-cfg-provider").addEventListener("change", async (e) => {
      let p = e.target.value;
      $("ais-cfg-custom-row").style.display = p === "custom" ? "" : "none";
      let previewUrl = (p === "custom" ? $("ais-cfg-api").value.trim().replace(/\/+$/, "") : PROVIDERS[p]?.url || PROVIDERS[DEFAULTS["ais-provider"]].url) + "/models";
      await fetchModels(populateModelDropdown, previewUrl);
    }), $("ais-cfg-model").addEventListener("change", updateThinkingSuffix), $("ais-cfg-refresh-models").addEventListener("click", async (e) => {
      let b = e.currentTarget;
      b.textContent = "...", await fetchModels(() => {
        populateModelDropdown(), b.textContent = "\u21BB";
      });
    }), $("ais-cfg-save").addEventListener("click", async (e) => {
      await saveSiteConfig(location.hostname, {
        post: $("ais-cfg-post").value.trim(),
        comments: $("ais-cfg-comments").value.trim()
      }), await set("ais-system-prompt", $("ais-cfg-system").value.trim() || DEFAULTS["ais-system-prompt"]), await set("ais-provider", $("ais-cfg-provider").value), await set("ais-custom-url", $("ais-cfg-api").value.trim()), await set("ais-api-key", $("ais-cfg-apikey").value.trim()), await set("ais-model", $("ais-cfg-model").value), await set("ais-model-suffix", $("ais-cfg-model-suffix").value.trim()), await set("ais-max-tokens", parseInt($("ais-cfg-tokens").value, 10) || DEFAULTS["ais-max-tokens"]), await set("ais-max-chars", parseInt($("ais-cfg-chars").value, 10) || DEFAULTS["ais-max-chars"]), cachedResponse = null, await highlightExtracted(), await updateTitle(), flashBtn(e.currentTarget, "Saved!", "Save");
    }), $("ais-cfg-reset").addEventListener("click", async () => {
      await deleteSiteConfig(location.hostname), await set("ais-system-prompt", DEFAULTS["ais-system-prompt"]), await set("ais-provider", DEFAULTS["ais-provider"]), await set("ais-custom-url", ""), await set("ais-api-key", ""), await set("ais-model", DEFAULTS["ais-model"]), await set("ais-model-suffix", ""), await set("ais-max-tokens", DEFAULTS["ais-max-tokens"]), await set("ais-max-chars", DEFAULTS["ais-max-chars"]), await updateSettingsInputs(), await updateTitle(), await highlightExtracted(), cachedResponse = null, await fetchModels(populateModelDropdown), flashBtn($("ais-cfg-reset"), "Done!", "Reset");
    });
    for (let resetBtn of settingsDiv.querySelectorAll(".ais-cfg-field-reset"))
      resetBtn.addEventListener("click", async () => {
        let field = resetBtn.dataset.reset;
        if (field) {
          if (field === "post" || field === "comments") {
            let c = (await getSiteConfigs())[location.hostname];
            c && (c[field] = "", await saveSiteConfig(location.hostname, c)), $(`ais-cfg-${field}`).value = "";
          } else field === "system" ? (await set("ais-system-prompt", DEFAULTS["ais-system-prompt"]), $("ais-cfg-system").value = DEFAULTS["ais-system-prompt"]) : field === "provider" ? (await set("ais-provider", DEFAULTS["ais-provider"]), $("ais-cfg-provider").value = DEFAULTS["ais-provider"], $("ais-cfg-custom-row").style.display = "none", await fetchModels(populateModelDropdown)) : field === "api" ? (await set("ais-custom-url", ""), $("ais-cfg-api").value = "") : field === "apikey" ? (await set("ais-api-key", ""), $("ais-cfg-apikey").value = "") : field === "model" ? (await set("ais-model", DEFAULTS["ais-model"]), await set("ais-model-suffix", ""), $("ais-cfg-model").value = "", $("ais-cfg-model-suffix").value = "", updateThinkingSuffix()) : field === "tokens" && (await set("ais-max-tokens", DEFAULTS["ais-max-tokens"]), await set("ais-max-chars", DEFAULTS["ais-max-chars"]), $("ais-cfg-tokens").value = DEFAULTS["ais-max-tokens"], $("ais-cfg-chars").value = DEFAULTS["ais-max-chars"]);
          flashBtn(resetBtn, "\u2713", "\u21BA");
        }
      });
    $("ais-cfg-export").addEventListener("click", async () => {
      let data = JSON.stringify({
        siteConfigs: { ...DEFAULTS["ais-site-configs"], ...await getSiteConfigs() },
        autoSummarize: await get("ais-auto-summarize-sites", {}),
        hiddenDomains: await getHiddenDomains(),
        systemPrompt: await cfg("ais-system-prompt"),
        provider: await cfg("ais-provider"),
        customUrl: await get("ais-custom-url", ""),
        apiKey: await cfg("ais-api-key") ? "***" : "",
        model: await cfg("ais-model"),
        modelSuffix: await cfg("ais-model-suffix"),
        maxTokens: await cfgInt("ais-max-tokens"),
        maxChars: await cfgInt("ais-max-chars")
      }, null, 2), url = URL.createObjectURL(new Blob([data], { type: "application/json" }));
      mk("a", { href: url, download: "ais-settings.json" }).click(), URL.revokeObjectURL(url);
    }), $("ais-cfg-import").addEventListener("click", () => {
      let input = mk("input", { type: "file", accept: ".json" });
      input.addEventListener("change", () => {
        let file = input.files[0];
        if (!file) return;
        let reader = new FileReader();
        reader.onload = async () => {
          try {
            let d = JSON.parse(reader.result);
            if (typeof d != "object" || d === null) throw new Error("Invalid");
            d.siteConfigs ? (await set("ais-site-configs", { ...await getSiteConfigs(), ...d.siteConfigs }), d.autoSummarize && await set("ais-auto-summarize-sites", { ...await get("ais-auto-summarize-sites", {}), ...d.autoSummarize }), d.hiddenDomains && await setHiddenDomains({ ...await getHiddenDomains(), ...d.hiddenDomains }), typeof d.systemPrompt == "string" && await set("ais-system-prompt", d.systemPrompt), typeof d.provider == "string" && d.provider in PROVIDERS && await set("ais-provider", d.provider), typeof d.customUrl == "string" && await set("ais-custom-url", d.customUrl), typeof d.apiKey == "string" && d.apiKey !== "***" && await set("ais-api-key", d.apiKey), typeof d.model == "string" && await set("ais-model", d.model), typeof d.modelSuffix == "string" && await set("ais-model-suffix", d.modelSuffix), typeof d.maxTokens == "number" && d.maxTokens > 0 && await set("ais-max-tokens", d.maxTokens), typeof d.maxChars == "number" && d.maxChars > 0 && await set("ais-max-chars", d.maxChars)) : await set("ais-site-configs", { ...await getSiteConfigs(), ...d }), autoCheck.checked = await getAutoSummarize(location.hostname), await updateSettingsInputs();
            let b = $("ais-cfg-import");
            b.style.background = "#4caf50", flashBtn(b, "Imported!", "Import"), setTimeout(() => {
              b.style.background = "";
            }, 1500);
          } catch {
            alert("Invalid JSON file");
          }
        }, reader.readAsText(file);
      }), input.click();
    }), hideBtn.addEventListener("click", async () => {
      let d = await getHiddenDomains();
      d[location.hostname] = !0, await setHiddenDomains(d), closePanel(), uiHost.remove();
    });
    function onPageInteraction(e) {
      !hasHighlights() || isVisible() || e && uiHost.contains(e.target) || clearHighlights();
    }
    if (window.addEventListener("scroll", onPageInteraction, { passive: !0 }), document.addEventListener("click", onPageInteraction), document.addEventListener("keydown", onPageInteraction), autoCheck.checked = await getAutoSummarize(location.hostname), autoCheck.addEventListener("change", () => setAutoSummarize(location.hostname, autoCheck.checked)), autoCheck.checked) {
      let trigger = () => setTimeout(() => {
        !isVisible() && !activeReq && (showPanel(), btn.textContent = "Close", runSummary());
      }, 3e3);
      document.readyState === "complete" ? trigger() : window.addEventListener("load", trigger);
    }
    options.onToggleMessage && options.onToggleMessage(() => {
      isVisible() ? closePanel() : (showPanel(), btn.textContent = "Close", cachedResponse ? body.replaceChildren(renderResponse(cachedResponse, !0)) : runSummary());
    });
  }

  // src/userscript/index.js
  setup(GM_getValue, GM_setValue);
  setup2(GM_xmlhttpRequest);
  createUI();
})();
