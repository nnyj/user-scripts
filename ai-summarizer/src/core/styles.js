export const STYLES = `
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
