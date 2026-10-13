// ==UserScript==
// @name        Template
// @namespace   https://github.com/nnyj/user-scripts
// @version     1.0.0
// @description Starting point for new scripts, copy this file and rename the `xx` prefix.
// @match       https://example.com/*
// @grant       none
// ==/UserScript==

(() => {
  // Shared theme: `.xx-ui` sets the colors, `.xx-primary`, `.xx-danger` and `.xx-dim` mark special controls.
  // Dark mode follows the OS, swap the media query for a site flag where one exists, e.g. YouTube `html[dark]`.
  const style = document.createElement('style');
  style.textContent = `
    .xx-ui { --ui-bg: #fff; --ui-fg: #0f0f0f; --ui-dim: #606060; --ui-btn: #0000000d; --ui-hover: #0000001a; --ui-border: #0000001a;
      --ui-accent: #065fd4; --ui-on-accent: #fff; --ui-danger: #cc0000; color-scheme: light;
      background: var(--ui-bg); color: var(--ui-fg); border: 1px solid var(--ui-border); border-radius: 12px;
      box-shadow: 0 4px 24px #0000004d; font: 500 13px Roboto, system-ui, sans-serif; }
    @media (prefers-color-scheme: dark) {
      .xx-ui { --ui-bg: #212121; --ui-fg: #f1f1f1; --ui-dim: #aaa; --ui-btn: #ffffff14; --ui-hover: #ffffff29; --ui-border: #ffffff1a;
        --ui-accent: #3ea6ff; --ui-on-accent: #0f0f0f; --ui-danger: #ff4e45; color-scheme: dark; }
    }
    .xx-ui :is(button, input) { font: inherit; height: 28px; padding: 0 12px; border: 0; border-radius: 8px;
      color: inherit; background: var(--ui-btn); cursor: pointer; transition: background .15s; }
    .xx-ui button:hover { background: var(--ui-hover); }
    .xx-ui input { cursor: text; }
    .xx-ui :disabled { opacity: .5; cursor: default; }
    .xx-ui .xx-primary { background: var(--ui-accent); color: var(--ui-on-accent); }
    .xx-ui .xx-primary:hover { background: var(--ui-accent); filter: brightness(1.1); }
    .xx-ui .xx-danger { color: var(--ui-danger); }
    .xx-ui .xx-dim { color: var(--ui-dim); }
    /* Dropdown: native <select> lists get a browser frame, so use a .xx-ui.xx-menu div inside a position: relative wrapper. */
    .xx-ui .xx-menu { position: absolute; bottom: calc(100% + 8px); right: 0; display: flex; flex-direction: column;
      min-width: 100%; max-height: 320px; overflow-y: auto; padding: 4px; }
    .xx-ui .xx-menu[hidden] { display: none; }
    .xx-menu button { flex-shrink: 0; text-align: left; white-space: nowrap; background: transparent; }
  `;
  document.head.append(style);

  // Builds nodes without innerHTML, which sites with Trusted Types block.
  function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  const panel = el('div', { className: 'xx-ui', style: 'position: fixed; right: 16px; bottom: 16px; z-index: 9999; display: flex; gap: 2px; padding: 4px;' },
    el('button', { className: 'xx-primary', textContent: 'Run' }),
    el('button', { textContent: 'Cancel' }),
    el('button', { className: 'xx-danger', textContent: 'Delete' }));
  document.body.append(panel);
})();
