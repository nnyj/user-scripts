# AI Page Summarizer

Browser tool that summarizes any page using a local LLM. Works as a userscript (Tampermonkey/Violentmonkey) or browser extension (Chrome/Firefox).

## Features

- streaming responses with live markdown rendering
- mermaid diagrams (mindmap, flowchart, sequence, pie, timeline, etc.)
- sentiment bars: `[bar:8/10 Quality]`
- thinking/reasoning display (collapsible)
- collapsible `<details>` sections, tables, code blocks, blockquotes
- per-site CSS selector config for post + comment extraction
- visual element picker (click to select, arrow keys for depth)
- auto-detect content on unknown sites (article, main, best text-ratio div)
- built-in site configs: Reddit, HN, Lobsters, Lemmy, Tildes, Stack Overflow, Discourse
- auto-summarize per domain
- hide per domain
- resizable panel with opacity control
- copy raw extracted text or rendered summary
- import/export settings
- token usage display (input/output) from API response

## Supported providers

Any OpenAI-compatible API:
- llama.cpp (`localhost:8080`)
- LM Studio (`localhost:1234`)
- CLIProxyAPI (`localhost:8317`)
- custom URL (any OpenAI-compatible endpoint)

Thinking/reasoning support for models that output `reasoning_content` or `reasoning` delta fields. Thinking level suffix (low/medium/high/max) configurable per model.

## Install

### Userscript

1. install [Tampermonkey](https://www.tampermonkey.net/) or [Violentmonkey](https://violentmonkey.github.io/)
2. open `ai-summarizer.user.js` from this repo, userscript manager will prompt to install
3. auto-updates from GitHub raw URL

### Extension (Chrome)

1. `npm install && npm run build`
2. `chrome://extensions` -> enable Developer mode -> Load unpacked -> select `dist/extension/`

### Extension (Firefox)

1. `npm install && node build.js --extension --firefox`
2. `about:debugging` -> This Firefox -> Load Temporary Add-on -> select `dist/extension/manifest.json`
3. or build the xpi: `cd dist/extension && zip -r ../ai-summarizer.xpi *`

## Build

```
npm install
npm run build              # both userscript + chrome extension
npm run build:userscript   # userscript only
npm run build:extension    # chrome extension only
node build.js --firefox    # firefox extension
```

Userscript loads marked, DOMPurify, mermaid from CDN via `@require`. Extension bundles everything via esbuild.

## Architecture

```
src/
  adapters/         DI wrappers for platform-divergent APIs
    http.js         stream + fetchJson interface
    storage.js      get/set interface
  core/             shared logic (both platforms)
    config.js       providers, defaults, site configs
    detect.js       auto-detect main content + comments via heuristics
    extract.js      content extraction, site config CRUD, highlight
    picker.js       visual element picker (click-to-select UI)
    render.js       markdown + mermaid + bars + thinking rendering
    styles.js       all CSS (injected into shadow DOM)
    ui.js           panel, settings, streaming, all DOM
  extension/        chrome/firefox extension wiring
    background.js   fetch proxy + streaming via ports
    content.js      entry point, mermaid bridge setup
    http.js         adapter impl using chrome.runtime ports
    storage.js      adapter impl using chrome.storage.local
    mermaid-bridge.js  MAIN world script for mermaid rendering (CSP workaround)
    mermaid-vendor.js  bundles mermaid as window.__aisMermaid
    manifest.json      chrome MV3 manifest
    manifest.firefox.json  firefox MV3 manifest
  userscript/       tampermonkey/violentmonkey wiring
    index.js        entry point
    http.js         adapter impl using GM_xmlhttpRequest
    storage.js      adapter impl using GM_getValue/GM_setValue
```

Adapter pattern: `adapters/http.js` and `adapters/storage.js` expose a uniform async interface. Each platform (extension, userscript) provides its own implementation at startup. Core code never touches platform APIs directly.

Mermaid in extension uses a MAIN world content script (`mermaid-bridge.js`) because Firefox MV3 CSP forbids `unsafe-eval` in content scripts, and mermaid uses `Function()`. The bridge loads `mermaid-vendor.js` as a `web_accessible_resource` via script injection, then communicates with the ISOLATED world content script via CustomEvents with JSON-stringified detail (Firefox Xray wrappers block object passing).

UI is injected into a shadow DOM to isolate styles from host page.

## Settings

All settings stored in `chrome.storage.local` (extension) or `GM_getValue/GM_setValue` (userscript).

| key                        | default    | description                        |
| -------------------------- | ---------- | ---------------------------------- |
| `ais-provider`             | `llamacpp` | active provider                    |
| `ais-model`                | (empty)    | model ID, empty = first available  |
| `ais-model-suffix`         | (empty)    | thinking level suffix              |
| `ais-max-tokens`           | 16000      | max output tokens                  |
| `ais-max-chars`            | 200000     | max input chars (truncation limit) |
| `ais-custom-url`           | (empty)    | custom provider URL                |
| `ais-api-key`              | (empty)    | bearer token                       |
| `ais-system-prompt`        | (long)     | system instructions                |
| `ais-opacity`              | 80         | panel opacity %                    |
| `ais-panel-width`          | null       | panel width px                     |
| `ais-site-configs`         | {}         | per-domain CSS selectors           |
| `ais-auto-summarize-sites` | {}         | per-domain auto-trigger            |
| `ais-hidden-domains`       | {}         | per-domain hide                    |
