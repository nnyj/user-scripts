export const STYLES = `
  #ais-panel, #ais-btns, #ais-picker-bar {
    --ui-bg: #fff; --ui-fg: #0f0f0f; --ui-dim: #606060; --ui-hover: #0000000d; --ui-border: #0000001a;
    --ui-accent: #065fd4; --ui-on-accent: #fff; --ui-danger: #cc0000; color-scheme: light;
    background: var(--ui-bg); color: var(--ui-fg); border: 1px solid var(--ui-border);
    box-shadow: 0 4px 24px #0000004d; font: 500 13px/1.5 Roboto, system-ui, sans-serif;
  }
  @media (prefers-color-scheme: dark) {
    #ais-panel, #ais-btns, #ais-picker-bar {
      --ui-bg: #212121; --ui-fg: #f1f1f1; --ui-dim: #aaa; --ui-hover: #ffffff1a; --ui-border: #ffffff1a;
      --ui-accent: #3ea6ff; --ui-on-accent: #0f0f0f; --ui-danger: #ff4e45; color-scheme: dark;
    }
  }
  :is(button, select, input:not([type=checkbox], [type=range])) {
    font: inherit; height: 28px; padding: 0 12px; border: 0; border-radius: 8px;
    color: inherit; background: transparent; cursor: pointer; transition: background .15s;
  }
  :is(button, select):hover { background: var(--ui-hover); }
  :is(input:not([type=checkbox], [type=range]), textarea) { background: var(--ui-hover); cursor: text; }
  :disabled { opacity: .5; cursor: default; }
  :is(#ais-btn, #ais-cfg-save, .ais-picker-done) { background: var(--ui-accent); color: var(--ui-on-accent); }
  :is(#ais-btn, #ais-cfg-save, .ais-picker-done):hover { background: var(--ui-accent); filter: brightness(1.1); }
  :is(#ais-hide, #ais-cfg-reset) { color: var(--ui-danger); }
  #ais-panel {
    position: fixed; z-index: 2147483646; top: 0; right: 0;
    width: 50vw; height: 100%; min-width: 220px;
    border-right: 0; border-radius: 12px 0 0 12px;
    display: none; flex-direction: column; overflow: hidden;
    opacity: 0; transform: translateX(100%);
    transition: opacity .2s, transform .25s ease;
  }
  #ais-panel.ais-open { transform: translateX(0); }
  #ais-opacity { width: 80px; height: 4px; cursor: pointer; accent-color: var(--ui-dim); margin: 0; }
  #ais-resize {
    position: absolute; left: 0; top: 0; width: 6px; height: 100%;
    cursor: ew-resize; z-index: 1;
  }
  #ais-resize:hover { background: var(--ui-hover); }
  #ais-header {
    padding: 8px 12px; background: var(--ui-hover); border-radius: 12px 0 0 0;
    user-select: none; flex-shrink: 0;
    display: flex; justify-content: space-between; align-items: center;
    font-size: 12px; color: var(--ui-dim);
  }
  #ais-close { cursor: pointer; font-size: 20px; line-height: 1; color: var(--ui-dim); }
  #ais-close:hover { color: var(--ui-fg); }
  #ais-body { padding: 12px 12px 60px; overflow-y: auto; flex: 1; }
  .ais-status { color: var(--ui-dim); font-size: 13px; }
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
  #ais-body :is(h1,h2,h3) { color: var(--ui-fg); margin: 12px 0 6px; font-size: 14px; border-bottom: 1px solid var(--ui-border); padding-bottom: 4px; }
  #ais-body h1 { font-size: 16px; }
  #ais-body :is(ul,ol) { padding-left: 18px; margin: 4px 0; }
  #ais-body li { margin: 3px 0; line-height: 1.5; }
  #ais-body p { margin: 4px 0; }
  #ais-body strong { color: var(--ui-fg); }
  #ais-body a { color: var(--ui-accent); }
  #ais-body code { background: var(--ui-hover); padding: 1px 4px; border-radius: 3px; font-size: 11px; }
  #ais-body pre code { display: block; padding: 8px; }
  #ais-body details summary { cursor: pointer; color: var(--ui-dim); font-size: 11px; margin: 6px 0 2px; list-style: none; }
  #ais-body details summary::before { content: '\\25b6 '; }
  #ais-body details[open] summary::before { content: '\\25bc '; }
  .think-body { color: var(--ui-dim); font-size: 11px; border-left: 2px solid var(--ui-border); padding-left: 8px; margin: 2px 0; }
  #ais-body table { border-collapse: collapse; width: 100%; margin: 8px 0; font-size: 12px; border-radius: 4px; overflow: hidden; }
  #ais-body th, #ais-body td { border: 1px solid var(--ui-border); padding: 6px 10px; text-align: left; }
  #ais-body th { background: var(--ui-hover); color: var(--ui-fg); font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  #ais-body tr:nth-child(even) { background: color-mix(in srgb, var(--ui-hover) 50%, transparent); }
  #ais-body tr:hover { background: var(--ui-hover); }
  #ais-body blockquote { border-left: 3px solid var(--ui-accent); margin: 6px 0; padding: 2px 10px; color: var(--ui-dim); background: var(--ui-hover); border-radius: 0 4px 4px 0; }
  #ais-body blockquote:first-child { border-left: 3px solid #ff6b35; background: #ff6b351a; padding: 8px 12px; margin-bottom: 12px; }
  #ais-body blockquote:first-child strong { color: #ff6b35; }
  .ais-bar { display: flex; align-items: center; gap: 8px; margin: 4px 0; font-size: 12px; }
  .ais-bar-label { width: 180px; color: var(--ui-fg); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
  .ais-bar-track { flex: 1; height: 14px; background: var(--ui-hover); border-radius: 3px; overflow: hidden; min-width: 80px; }
  .ais-bar-fill { height: 100%; border-radius: 3px; transition: width .3s ease; }
  .ais-bar-value { color: var(--ui-dim); font-size: 11px; white-space: nowrap; flex-shrink: 0; }
  /* stays dark in light mode, mermaid renders with its dark theme */
  .ais-mermaid { background: #222; border-radius: 6px; padding: 12px; margin: 8px 0; overflow-x: auto; text-align: center; }
  .ais-mermaid svg { max-width: 100%; height: auto; }
  #ais-body hr { border: none; border-top: 1px solid var(--ui-border); margin: 12px 0; }
  #ais-body img { max-width: 100%; border-radius: 4px; margin: 4px 0; }
  #ais-btns {
    position: fixed; bottom: 20px; right: 0; z-index: 2147483647;
    display: flex; gap: 2px; flex-direction: row-reverse;
    padding: 4px 12px 4px 14px;
    background: color-mix(in srgb, var(--ui-bg) 75%, transparent);
    backdrop-filter: blur(12px);
    border-right: 0; border-radius: 12px 0 0 12px;
    border-left: 3px solid var(--ui-accent);
    transform: translateX(calc(100% - 14px));
    transition: transform .3s cubic-bezier(.4,0,.2,1);
  }
  #ais-btns:hover { transform: translateX(0); }
  #ais-hide { font-size: 16px; padding: 0 9px; line-height: 1; }
  #ais-auto-label {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: var(--ui-dim); cursor: pointer; user-select: none;
  }
  #ais-auto-label input { margin: 0; cursor: pointer; }
  #ais-gear { cursor: pointer; font-size: 20px; line-height: 1; color: var(--ui-dim); margin-right: 4px; }
  #ais-gear:hover { color: var(--ui-fg); }
  #ais-settings {
    background: var(--ui-hover); border-bottom: 1px solid var(--ui-border);
    padding: 0 12px; max-height: 0; overflow: hidden;
    transition: max-height .25s ease, padding .25s ease;
    font-size: 11px;
  }
  #ais-settings.ais-cfg-open { max-height: 500px; padding: 8px 12px; overflow-y: auto; }
  .ais-cfg-row { display: flex; gap: 4px; align-items: center; margin-bottom: 4px; }
  .ais-cfg-row label { color: var(--ui-dim); width: 65px; flex-shrink: 0; }
  .ais-cfg-row input[type="text"], .ais-cfg-row input[type="password"], .ais-cfg-row select, .ais-cfg-row textarea {
    flex: 1; min-width: 0; padding: 0 8px; font: 11px monospace;
  }
  .ais-cfg-row textarea { color: inherit; border: 0; border-radius: 8px; padding: 4px 8px; font: 12px/1.4 monospace; resize: vertical; min-height: 40px; }
  .ais-cfg-row button, .ais-cfg-btns button { padding: 0 8px; white-space: nowrap; }
  .ais-cfg-btns { display: flex; gap: 4px; justify-content: space-between; margin-top: 6px; }
  .ais-cfg-field-reset { font-size: 9px !important; padding: 0 4px !important; opacity: 0.5; }
  .ais-cfg-field-reset:hover { opacity: 1 !important; }
  #ais-cfg-source { color: var(--ui-dim); font-size: 10px; font-style: italic; }
  .ais-hidden-row { display: flex; align-items: center; gap: 4px; padding: 3px 6px; border-radius: 8px; }
  .ais-hidden-row:nth-child(even) { background: color-mix(in srgb, var(--ui-hover) 50%, transparent); }
  .ais-hidden-row:hover { background: var(--ui-hover); }
  .ais-hidden-row span { color: var(--ui-fg); font-size: 11px; flex: 1; }
  #ais-hidden-details > summary { color: var(--ui-dim); font-size: 11px; cursor: pointer; list-style: none; user-select: none; }
  #ais-hidden-details > summary::before { content: '\\25b6 '; }
  #ais-hidden-details[open] > summary::before { content: '\\25bc '; }
  #ais-picker-hl {
    position: fixed; z-index: 2147483645; pointer-events: none; display: none;
    background: rgba(255, 255, 0, 0.15); border: 2px solid rgba(255, 200, 0, 0.7);
    transition: top .04s, left .04s, width .04s, height .04s;
  }
  #ais-picker-bar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 2147483647;
    padding: 6px 16px; font-size: 12px; display: none;
    border-width: 1px 0 0; align-items: center; gap: 12px;
  }
  .ais-picker-label { white-space: nowrap; }
  .ais-picker-sel {
    color: var(--ui-dim); flex: none; font: 11px monospace;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .ais-picker-list {
    flex: 1; display: flex; flex-wrap: wrap; gap: 4px; overflow: hidden;
  }
  .ais-picker-tag {
    background: var(--ui-hover); color: var(--ui-fg); font: 11px monospace;
    padding: 2px 6px; border-radius: 8px; display: flex; align-items: center; gap: 4px;
  }
  .ais-picker-tag-x {
    cursor: pointer; color: var(--ui-dim); font-size: 13px; line-height: 1;
  }
  .ais-picker-tag-x:hover { color: var(--ui-danger); }
`;
