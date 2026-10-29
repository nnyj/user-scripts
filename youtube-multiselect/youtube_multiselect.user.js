// ==UserScript==
// @name        YouTube Multiselect
// @namespace   https://github.com/nnyj/youtube-multiselect
// @version     1.0.1
// @description Select several playlist videos, then copy, move or remove them in one go.
// @icon        https://www.youtube.com/favicon.ico
// @match       https://www.youtube.com/*
// @grant       none
// @run-at      document-idle
// ==/UserScript==

(() => {
  const ROW = 'ytd-browse:not([hidden]) ytd-playlist-video-renderer:not(.yms-gone)';
  const BATCH_SIZE = 50;

  const picked = new Set();
  let last_row = null;
  let targets_for = null;
  let target_id = '';

  const style = document.createElement('style');
  style.textContent = `
    .yms-ui { --ui-bg: #fff; --ui-fg: #0f0f0f; --ui-dim: #606060; --ui-btn: #0000000d; --ui-hover: #0000001a; --ui-border: #0000001a;
      --ui-accent: #065fd4; --ui-on-accent: #fff; --ui-danger: #cc0000; color-scheme: light;
      background: var(--ui-bg); color: var(--ui-fg); border: 1px solid var(--ui-border); border-radius: 12px;
      box-shadow: 0 4px 24px #0000004d; font: 500 13px Roboto, system-ui, sans-serif; }
    html[dark] .yms-ui { --ui-bg: #212121; --ui-fg: #f1f1f1; --ui-dim: #aaa; --ui-btn: #ffffff14; --ui-hover: #ffffff29; --ui-border: #ffffff1a;
      --ui-accent: #3ea6ff; --ui-on-accent: #0f0f0f; --ui-danger: #ff4e45; color-scheme: dark; }
    .yms-ui :is(button, input) { font: inherit; height: 28px; padding: 0 12px; border: 0; border-radius: 8px;
      color: inherit; background: var(--ui-btn); cursor: pointer; transition: background .15s; }
    .yms-ui button:hover { background: var(--ui-hover); }
    .yms-ui :disabled { opacity: .5; cursor: default; }
    .yms-ui .yms-primary { background: var(--ui-accent); color: var(--ui-on-accent); }
    .yms-ui .yms-primary:hover { background: var(--ui-accent); filter: brightness(1.1); }
    .yms-ui .yms-danger { color: var(--ui-danger); }
    .yms-ui .yms-dim { padding: 0 8px; color: var(--ui-dim); }
    .yms-ui .yms-menu { position: absolute; bottom: calc(100% + 8px); right: 0; display: flex; flex-direction: column;
      min-width: 100%; max-height: 320px; overflow-y: auto; padding: 4px; }
    .yms-menu button { flex-shrink: 0; text-align: left; white-space: nowrap; background: transparent; }
    .yms-bar { position: fixed; right: 16px; bottom: 16px; z-index: 9999; display: flex; gap: 4px; align-items: center; padding: 4px; }
    .yms-bar[hidden], .yms-ui .yms-menu[hidden], html:not(.yms-on) .yms-tool, .yms-dim:empty { display: none; }
    .yms-picker { position: relative; }
    .yms-target { max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    html.yms-on ytd-playlist-video-renderer { cursor: pointer; user-select: none; }
    ytd-playlist-video-renderer.yms-picked { background: #3ea6ff40; outline: 2px solid #3ea6ff; outline-offset: -2px; }
    .yms-gone { display: none !important; }
  `;
  document.head.append(style);

  // YouTube enforces Trusted Types, so the UI is built with DOM calls instead of innerHTML.
  function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  const tool = (label, onclick, kind = '') => el('button', { className: `yms-tool ${kind}`, textContent: label, onclick });
  const count = el('span', { className: 'yms-tool yms-dim' });
  const status = el('span', { className: 'yms-tool yms-dim' });
  const menu = el('div', { className: 'yms-ui yms-menu', hidden: true });
  const target_button = el('button', { className: 'yms-target', title: 'Target playlist', onclick: () => { menu.hidden = !menu.hidden; } });
  const target_picker = el('span', { className: 'yms-tool yms-picker' }, target_button, menu);
  const toggle = el('button', { className: 'yms-primary', textContent: 'Select', onclick: () => mode_set(!select_mode()) });
  const bar = el('div', { className: 'yms-ui yms-bar', hidden: true },
    toggle, count,
    tool('All', () => rows().forEach(row => pick(row, true))),
    tool('None', () => picked_clear()),
    target_picker,
    tool('Copy', () => run('copy')),
    tool('Move', () => run('move')),
    tool('Remove', () => run('remove'), 'yms-danger'),
    status);
  document.body.append(bar);

  const select_mode = () => document.documentElement.classList.contains('yms-on');
  const rows = () => [...document.querySelectorAll(ROW)];
  const row_data = row => row.data ?? row.__data?.data;
  const source_id = () => new URLSearchParams(location.search).get('list');
  const playlist_id_parse = text => text?.match(/[?&]list=([\w-]+)/)?.[1] ?? text?.trim();

  function count_render() {
    count.textContent = `${picked.size} picked`;
  }

  function pick(row, on) {
    row.classList.toggle('yms-picked', on);
    if (on) picked.add(row);
    else picked.delete(row);
    count_render();
  }

  function picked_clear() {
    picked.forEach(row => row.classList.remove('yms-picked'));
    picked.clear();
    last_row = null;
    count_render();
  }

  function mode_set(on) {
    document.documentElement.classList.toggle('yms-on', on);
    toggle.textContent = on ? 'Done' : 'Select';
    if (!on) picked_clear();
    menu.hidden = true;
    if (on) targets_load();
    count_render();
  }

  function page_sync() {
    mode_set(false);
    status.textContent = '';
    bar.hidden = location.pathname !== '/playlist';
  }

  // Shift-click picks the range from the previous click, all on or all off to match the clicked row.
  document.addEventListener('click', event => {
    if (!select_mode()) return;
    const row = event.target.closest('ytd-playlist-video-renderer');
    if (!row) return;
    event.preventDefault();
    event.stopPropagation();
    const on = !picked.has(row);
    const all = rows();
    const [a, b] = [all.indexOf(last_row), all.indexOf(row)].sort((x, y) => x - y);
    const range = event.shiftKey && last_row && a >= 0 ? all.slice(a, b + 1) : [row];
    range.forEach(r => pick(r, on));
    last_row = row;
  }, true);

  document.addEventListener('click', event => {
    if (!target_picker.contains(event.target)) menu.hidden = true;
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    if (!menu.hidden) menu.hidden = true;
    else if (select_mode()) mode_set(false);
  });

  function target_set(id, title) {
    target_id = id;
    target_button.textContent = `${title} ▾`;
    menu.hidden = true;
  }

  function target_prompt() {
    const id = playlist_id_parse(prompt('Target playlist URL or ID'));
    if (id) target_set(id, id);
    else menu.hidden = true;
  }

  // Innertube calls need the SAPISIDHASH header that youtube.com builds from the SAPISID cookie.
  async function auth_header() {
    const sapisid = document.cookie.match(/(?:^|;\s*)(?:SAPISID|__Secure-3PAPISID)=([^;]+)/)?.[1];
    if (!sapisid) throw new Error('Not signed in');
    const ts = Math.floor(Date.now() / 1000);
    const digest = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${ts} ${sapisid} ${location.origin}`));
    const hex = [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
    return `SAPISIDHASH ${ts}_${hex}`;
  }

  async function innertube(endpoint, body) {
    const cfg = window.ytcfg;
    const res = await fetch(`/youtubei/v1/${endpoint}?prettyPrint=false`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': await auth_header(),
        'X-Origin': location.origin,
        'X-Goog-AuthUser': String(cfg.get('SESSION_INDEX') ?? 0),
        'X-Youtube-Client-Name': String(cfg.get('INNERTUBE_CONTEXT_CLIENT_NAME')),
        'X-Youtube-Client-Version': cfg.get('INNERTUBE_CLIENT_VERSION'),
      },
      body: JSON.stringify({ context: cfg.get('INNERTUBE_CONTEXT'), ...body }),
    });
    if (!res.ok) throw new Error(`${endpoint}: HTTP ${res.status}`);
    return res.json();
  }

  async function playlist_edit(playlist_id, actions) {
    for (let i = 0; i < actions.length; i += BATCH_SIZE) {
      const res = await innertube('browse/edit_playlist', { playlistId: playlist_id, actions: actions.slice(i, i + BATCH_SIZE) });
      if (res.status !== 'STATUS_SUCCEEDED') throw new Error(`edit_playlist: ${res.status ?? 'no status'}`);
    }
  }

  // Lists the signed-in user's playlists the same way the `Save` dialog does.
  async function targets_load() {
    const source = source_id();
    const video_id = row_data(rows()[0])?.videoId;
    if (!video_id || targets_for === source) return;
    targets_for = source;
    target_button.textContent = 'Loading…';
    let playlists = [];
    try {
      const res = await innertube('playlist/get_add_to_playlist', { videoIds: [video_id], excludeWatchLater: false });
      playlists = (res.contents?.[0]?.addToPlaylistRenderer?.playlists ?? [])
        .map(item => item.playlistAddToOptionRenderer)
        .filter(p => p && p.playlistId !== source);
    } catch (err) {
      status.textContent = err.message;
    }
    const targets = playlists.map(p => [p.playlistId, p.title?.simpleText ?? p.title?.runs?.[0]?.text ?? p.playlistId]);
    menu.replaceChildren(
      el('button', { textContent: 'Enter URL…', onclick: target_prompt }),
      ...targets.map(([id, title]) => el('button', { textContent: title, onclick: () => target_set(id, title) })));
    target_set(...(targets[0] ?? ['', 'Enter URL…']));
  }

  async function run(kind) {
    const picked_rows = rows().filter(row => picked.has(row));
    const items = picked_rows.map(row_data);
    if (!items.length) return;
    let target = null;
    if (kind !== 'remove') {
      target = target_id || playlist_id_parse(prompt('Target playlist URL or ID'));
      if (!target) return;
    }
    if (kind !== 'copy' && items.some(item => !item?.setVideoId)) {
      status.textContent = 'Only your own playlists allow remove';
      return;
    }
    if (kind === 'remove' && !confirm(`Remove ${items.length} videos from this playlist?`)) return;

    bar.querySelectorAll('button').forEach(node => { node.disabled = true; });
    status.textContent = 'Working…';
    try {
      if (target) await playlist_edit(target, items.map(item => ({ action: 'ACTION_ADD_VIDEO', addedVideoId: item.videoId })));
      if (kind !== 'copy') {
        await playlist_edit(source_id(), items.map(item => ({ action: 'ACTION_REMOVE_VIDEO', setVideoId: item.setVideoId })));
        picked_rows.forEach(row => row.classList.add('yms-gone'));
      }
      picked_clear();
      status.textContent = `${kind === 'copy' ? 'Copied' : kind === 'move' ? 'Moved' : 'Removed'} ${items.length}`;
    } catch (err) {
      status.textContent = err.message;
    } finally {
      bar.querySelectorAll('button').forEach(node => { node.disabled = false; });
    }
  }

  window.addEventListener('yt-navigate-finish', page_sync);
  page_sync();
})();
