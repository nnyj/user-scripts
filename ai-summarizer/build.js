const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const buildUserscript = !args.length || args.includes('--userscript');
const buildExtension = !args.length || args.includes('--extension');
const firefox = args.includes('--firefox');

const RAW_BASE = 'https://raw.githubusercontent.com/nnyj/user-scripts/main/ai-summarizer';

const USERSCRIPT_HEADER = `// ==UserScript==
// @name         AI Page Summarizer
// @version      2.0.0
// @description  Summarize any page using a local LLM (LMStudio, etc.)
// @namespace    https://github.com/nnyj/user-scripts
// @homepageURL  https://github.com/nnyj/user-scripts
// @updateURL    ${RAW_BASE}/ai-summarizer.user.js
// @downloadURL  ${RAW_BASE}/ai-summarizer.user.js
// @icon         data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#1a1a1b"/><path d="M6 8h14M6 13h20M6 18h16M6 23h12" stroke="#ff6b35" stroke-width="2.5" stroke-linecap="round"/><circle cx="25" cy="22" r="5.5" fill="#ff4500"/><path d="M23 22l2 2 3-3.5" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>')}
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
`;

async function build() {
  const common = {
    bundle: true,
    format: 'iife',
    target: 'es2020',
    minifySyntax: true,
    sourcemap: false,
  };

  if (buildUserscript) {
    await esbuild.build({
      ...common,
      entryPoints: ['src/userscript/index.js'],
      outfile: 'ai-summarizer.user.js',
      banner: { js: USERSCRIPT_HEADER },
      external: ['mermaid', 'marked', 'dompurify'],
      plugins: [mermaidCdnPlugin(), markedCdnPlugin(), dompurifyCdnPlugin()],
    });
    console.log('Built: ai-summarizer.user.js');
  }

  if (buildExtension) {
    await esbuild.build({
      ...common,
      entryPoints: ['src/extension/content.js'],
      outfile: 'dist/extension/content.js',
      external: ['mermaid'],
      plugins: [mermaidStubPlugin()],
    });
    await esbuild.build({
      ...common,
      entryPoints: ['src/extension/background.js'],
      outfile: 'dist/extension/background.js',
    });
    await esbuild.build({
      ...common,
      entryPoints: ['src/extension/mermaid-vendor.js'],
      outfile: 'dist/extension/mermaid-vendor.js',
    });
    fs.copyFileSync('src/extension/mermaid-bridge.js', path.join('dist', 'extension', 'mermaid-bridge.js'));
    const manifestSrc = firefox ? 'src/extension/manifest.firefox.json' : 'src/extension/manifest.json';
    fs.copyFileSync(manifestSrc, path.join('dist', 'extension', 'manifest.json'));
    console.log(`Built: dist/extension/ (${firefox ? 'firefox' : 'chrome'})`);
  }
}

function mermaidStubPlugin() {
  return {
    name: 'mermaid-stub',
    setup(build) {
      build.onResolve({ filter: /^mermaid$/ }, () => {
        return { path: 'mermaid', namespace: 'mermaid-stub' };
      });
      build.onLoad({ filter: /.*/, namespace: 'mermaid-stub' }, () => {
        return {
          contents: `throw new Error('mermaid not available in content script');`,
          loader: 'js',
        };
      });
    },
  };
}

function mermaidCdnPlugin() {
  return {
    name: 'mermaid-cdn',
    setup(build) {
      build.onResolve({ filter: /^mermaid$/ }, () => {
        return { path: 'mermaid', namespace: 'mermaid-cdn' };
      });
      build.onLoad({ filter: /.*/, namespace: 'mermaid-cdn' }, () => {
        return {
          contents: `
            const mod = typeof mermaid !== 'undefined' ? mermaid : null;
            export default mod;
          `,
          loader: 'js',
        };
      });
    },
  };
}

function markedCdnPlugin() {
  return {
    name: 'marked-cdn',
    setup(build) {
      build.onResolve({ filter: /^marked$/ }, () => {
        return { path: 'marked', namespace: 'marked-cdn' };
      });
      build.onLoad({ filter: /.*/, namespace: 'marked-cdn' }, () => {
        return {
          contents: `export const marked = typeof window !== 'undefined' && window.marked ? window.marked : { parse: t => t, parseInline: t => t };`,
          loader: 'js',
        };
      });
    },
  };
}

function dompurifyCdnPlugin() {
  return {
    name: 'dompurify-cdn',
    setup(build) {
      build.onResolve({ filter: /^dompurify$/ }, () => {
        return { path: 'dompurify', namespace: 'dompurify-cdn' };
      });
      build.onLoad({ filter: /.*/, namespace: 'dompurify-cdn' }, () => {
        return {
          contents: `const mod = typeof DOMPurify !== 'undefined' ? DOMPurify : { sanitize: t => t }; export default mod;`,
          loader: 'js',
        };
      });
    },
  };
}

build().catch(e => { console.error(e); process.exit(1); });
