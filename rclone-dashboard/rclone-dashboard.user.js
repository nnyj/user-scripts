// ==UserScript==
// @name        Rclone Dashboard
// @description Compact grouped stats, progress bars, expandable errors, sidebar memory, focus mode
// @version     1.0
// @homepageURL https://github.com/nnyj/user-scripts/tree/main/rclone-dashboard
// @updateURL   https://raw.githubusercontent.com/nnyj/user-scripts/main/rclone-dashboard/rclone-dashboard.user.js
// @icon        https://rclone.org/img/favicon-32x32.png
// @match       *://*:5572/*
// @run-at      document-idle
// @grant       none
// ==/UserScript==

(function() {
  'use strict';

  const POLL_MS = 1000;
  const FOCUS_KEY = 'rcx-focus';
  const SIDEBAR_KEY = 'rcx-sidebar-collapsed';

  // --- css ---
  const css = `
    :root {
      --rcx-bg: #2f353a;
      --rcx-bg2: #3a4149;
      --rcx-border: #4b5155;
      --rcx-fg: #e4e7ea;
      --rcx-dim: #c8ced3;
      --rcx-acc: #20a8d8;
      --rcx-ok: #4dbd74;
      --rcx-warn: #ffc107;
      --rcx-err: #f86c6b;
      --rcx-sl: #8ad4ee;
    }
    .progress-modal { display: none !important; }
    [data-test="homeComponent"] > .row > .col-sm-12.col-lg-4 > .card { display: none !important; }
    [data-test="homeComponent"] > .row > .col-sm-12.col-lg-4 {
      flex: 0 0 100% !important; max-width: 100% !important;
    }
    body.rcx-focus [data-test="homeComponent"] > .row > .col-sm-12.col-lg-6 { display: none !important; }
    body.rcx-focus [data-test="homeComponent"] > .row > .col-sm-12.col-lg-8 { display: none !important; }
    .card { margin-bottom: 6px !important; }
    .card-header { padding: 5px 10px !important; font-size: 0.9rem !important; }
    .card-body { padding: 6px 10px !important; }
    .card-body p { margin-bottom: 1px !important; font-size: 0.85rem !important; }
    .table td { padding: 3px 8px !important; font-size: 0.85rem !important; }

    #rcx-root {
      font: 0.82rem/1.4 'Consolas','SF Mono',Menlo,monospace;
      color: var(--rcx-fg);
      display: flex; flex-direction: column; gap: 8px;
    }

    .rcx-overall {
      background: var(--rcx-bg); border: 1px solid var(--rcx-border);
      border-radius: 4px; padding: 8px 12px; display: flex; flex-direction: column; gap: 6px;
    }
    .rcx-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .rcx-row > .rcx-label { color: var(--rcx-sl); margin-right: 4px; }
    .rcx-stats-row { gap: 16px; font-size: 0.78rem; }
    .rcx-stat .rcx-label { color: var(--rcx-sl); }
    .rcx-stat.err { color: var(--rcx-err); }
    .rcx-bar {
      flex: 1; min-width: 120px; height: 16px;
      background: var(--rcx-border); border-radius: 3px;
      position: relative; overflow: hidden;
    }
    .rcx-bar-fill {
      height: 100%; background: var(--rcx-acc);
      transition: width 0.6s cubic-bezier(.4,0,.2,1);
    }
    .rcx-bar-fill.ok { background: var(--rcx-ok); }
    .rcx-bar-fill.warn { background: var(--rcx-warn); }
    .rcx-bar-fill.err { background: var(--rcx-err); }
    .rcx-bar-text {
      position: absolute; inset: 0; text-align: center;
      line-height: 16px; font-size: 0.72rem; color: #fff;
      text-shadow: 0 0 4px rgba(0,0,0,.8); font-weight: 600;
    }

    .rcx-btn {
      background: transparent; border: 1px solid var(--rcx-dim);
      color: var(--rcx-dim); border-radius: 3px;
      padding: 1px 8px; cursor: pointer; font: inherit; font-size: 0.75rem;
      line-height: 1.5; transition: .15s;
    }
    .rcx-btn:hover { border-color: var(--rcx-acc); color: var(--rcx-acc); }
    .rcx-btn.active { border-color: var(--rcx-acc); color: var(--rcx-acc); background: rgba(32,168,216,.1); }
    .rcx-btn-danger { border-color: var(--rcx-err); color: var(--rcx-err); }
    .rcx-btn-danger:hover { background: var(--rcx-err); color: #fff; }

    .rcx-wide-groups { display: flex; flex-direction: column; gap: 8px; }
    .rcx-wide-groups .rcx-files {
      display: block; column-width: 400px; column-gap: 8px;
    }
    .rcx-wide-groups .rcx-file { break-inside: avoid; }

    .rcx-groups {
      column-width: 440px; column-gap: 8px;
    }
    .rcx-group {
      background: var(--rcx-bg); border: 1px solid var(--rcx-border);
      border-radius: 4px; overflow: hidden; display: flex; flex-direction: column;
      break-inside: avoid; margin-bottom: 8px;
    }
    .rcx-group.empty { opacity: .35; }
    .rcx-group-hdr { padding: 6px 10px; border-bottom: 1px solid var(--rcx-bg2); overflow: hidden; }
    .rcx-group-hdr .rcx-row { flex-wrap: nowrap; gap: 6px; }
    .rcx-group-name {
      font-weight: 700; color: var(--rcx-fg); white-space: nowrap;
      overflow: hidden; text-overflow: ellipsis; max-width: 200px; flex-shrink: 1;
    }
    .rcx-group-started { color: var(--rcx-dim); font-size: 0.74rem; white-space: nowrap; }
    .rcx-group-cancel {
      background: transparent; border: 1px solid var(--rcx-err); color: var(--rcx-err);
      border-radius: 3px; padding: 0 6px; cursor: pointer;
      font: inherit; font-size: 0.72rem; line-height: 1.5; transition: .15s;
    }
    .rcx-group-cancel:hover { background: var(--rcx-err); color: #fff; }
    .rcx-group-cancel:disabled { opacity: .5; cursor: default; }
    .rcx-group-stats {
      padding: 4px 10px; display: flex; flex-wrap: wrap; gap: 2px 14px;
      font-size: 0.74rem; border-bottom: 1px solid var(--rcx-bg2);
    }
    .rcx-group-stats .rcx-stat { color: var(--rcx-dim); }
    .rcx-group-stats .rcx-stat.err {
      cursor: pointer; text-decoration: underline dotted;
    }

    .rcx-files { display: flex; flex-direction: column; }
    .rcx-file {
      padding: 4px 10px; border-bottom: 1px solid var(--rcx-bg2);
      display: flex; flex-direction: column; gap: 3px;
    }
    .rcx-file:last-child { border-bottom: none; }
    .rcx-file-top {
      display: flex; justify-content: space-between; align-items: baseline; gap: 10px;
    }
    .rcx-fname {
      color: var(--rcx-dim); flex: 1; min-width: 0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; direction: rtl; text-align: left;
    }
    .rcx-fname:hover { overflow: visible; }
    .rcx-fmeta { color: var(--rcx-sl); font-size: 0.74rem; white-space: nowrap; }
    .rcx-file .rcx-bar { height: 12px; }
    .rcx-file .rcx-bar-text { line-height: 12px; font-size: 0.66rem; }

    .rcx-errors {
      max-height: 160px; overflow-y: auto;
      padding: 4px 10px; font-size: 0.72rem;
      border-top: 1px solid var(--rcx-bg2); background: rgba(248,108,107,.05);
    }
    .rcx-errors div { padding: 1px 0; word-break: break-all; color: var(--rcx-err); }
    .rcx-errors .muted { color: var(--rcx-dim); font-style: italic; }

    .rcx-idle {
      padding: 10px; text-align: center; color: var(--rcx-dim);
      font-style: italic; font-size: 0.8rem;
    }
  `;
  const styleEl = document.createElement('style');
  styleEl.textContent = css;
  document.head.appendChild(styleEl);

  // --- helpers ---
  const UNITS = ['B','KiB','MiB','GiB','TiB','PiB'];
  function fmtB(b) {
    if (!b || b < 0) return '0 B';
    const i = Math.min(Math.floor(Math.log(b) / Math.log(1024)), UNITS.length - 1);
    const v = b / Math.pow(1024, i);
    return (i > 0 ? v.toFixed(v < 10 ? 2 : v < 100 ? 1 : 0) : v.toFixed(0)) + ' ' + UNITS[i];
  }
  const fmtSpd = b => fmtB(b) + '/s';
  function fmtETA(s) {
    if (!s || s <= 0 || !isFinite(s)) return '-';
    const h = Math.floor(s/3600), m = Math.floor((s%3600)/60), sec = Math.floor(s%60);
    if (h > 0) return h + 'h' + String(m).padStart(2,'0') + 'm';
    if (m > 0) return m + 'm' + String(sec).padStart(2,'0') + 's';
    return sec + 's';
  }
  const escEl = document.createElement('div');
  const esc = s => { escEl.textContent = String(s); return escEl.innerHTML; };
  const MONTHS = ['Jan','Feb','Mar','Apr','May','June','July','Aug','Sep','Oct','Nov','Dec'];

  function rc(endpoint, body) {
    return fetch(endpoint, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      credentials: 'include',
      body: JSON.stringify(body || {})
    }).then(r => r.json());
  }

  // --- sidebar + focus persistence ---
  function applySidebar() {
    if (localStorage.getItem(SIDEBAR_KEY) !== '1') return;
    document.body.classList.add('sidebar-minimized', 'brand-minimized');
    const sb = document.querySelector('.sidebar');
    if (sb) sb.classList.add('sidebar-minimized');
  }
  let sidebarBound = false;
  function bindSidebarToggle() {
    if (sidebarBound) return;
    const t = document.querySelector('.sidebar-toggler, .sidebar-minimizer');
    if (!t) return;
    sidebarBound = true;
    t.addEventListener('click', () => setTimeout(() => {
      localStorage.setItem(SIDEBAR_KEY, document.body.classList.contains('sidebar-minimized') ? '1':'0');
    }, 100));
  }
  let sRetries = 0;
  const sInterval = setInterval(() => {
    applySidebar(); bindSidebarToggle();
    if (++sRetries > 25) clearInterval(sInterval);
  }, 200);

  function applyFocus() {
    document.body.classList.toggle('rcx-focus', localStorage.getItem(FOCUS_KEY) === '1');
  }
  applyFocus();

  // --- state ---
  const knownGroups = new Set();
  const openErrors = new Set();
  const WIDE_THRESHOLD = 8;
  let root = null, overallBarFill = null, overallBarText = null,
      overallRow = null, wideGroupsEl = null, groupsEl = null, idleEl = null;
  const groupNodes = new Map();      // name -> {card, hdr, nameEl, bar, barFill, barText, cancel, stats, filesEl, errorsEl}

  function ensureRoot() {
    const col = document.querySelector('[data-test="homeComponent"] > .row > .col-sm-12.col-lg-4');
    if (!col) return false;
    if (!root || !root.isConnected) {
      root = document.createElement('div');
      root.id = 'rcx-root';

      const overall = $('div', {class:'rcx-overall'}, root);
      const barRow = $('div', {class:'rcx-row'}, overall);
      $('span', {class:'rcx-group-name', textContent:'Overall'}, barRow);
      const overallBar = $('div', {class:'rcx-bar'}, barRow);
      overallBarFill = $('div', {class:'rcx-bar-fill'}, overallBar);
      overallBarText = $('div', {class:'rcx-bar-text'}, overallBar);
      overallRow = $('div', {class:'rcx-row rcx-stats-row'}, overall);

      wideGroupsEl = $('div', {class:'rcx-wide-groups'});
      root.appendChild(wideGroupsEl);
      groupsEl = $('div', {class:'rcx-groups'});
      root.appendChild(groupsEl);
      col.appendChild(root);
    }
    return true;
  }
  // tiny element helper
  function $(tag, props={}, parent=null) {
    const el = document.createElement(tag);
    for (const [k,v] of Object.entries(props)) {
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else el[k] = v;
    }
    if (parent) parent.appendChild(el);
    return el;
  }

  function setStat(row, key, html, cls='') {
    let el = row.querySelector(`[data-key="${key}"]`);
    if (!el) {
      el = $('span', {class:'rcx-stat ' + cls, dataset:{key}}, row);
    }
    el.className = 'rcx-stat ' + cls;
    el.innerHTML = html;
  }

  function buildGroup(name) {
    const card = $('div', {class:'rcx-group'});
    const hdr = $('div', {class:'rcx-group-hdr'}, card);
    const barRow = $('div', {class:'rcx-row'}, hdr);
    const nameEl = $('span', {class:'rcx-group-name'}, barRow);
    nameEl.textContent = name; nameEl.title = name;
    const startedEl = $('span', {class:'rcx-group-started'}, barRow);
    const bar = $('div', {class:'rcx-group-bar rcx-bar'}, barRow);
    const barFill = $('div', {class:'rcx-bar-fill'}, bar);
    const barText = $('div', {class:'rcx-bar-text'}, bar);
    const jobMatch = name.match(/^job\/(\d+)$/);
    const jobId = jobMatch ? parseInt(jobMatch[1], 10) : 0;
    const cancel = $('button', {class:'rcx-group-cancel', title:'Cancel job', textContent:'\u2715'}, barRow);
    if (!jobId) cancel.style.display = 'none';
    const stats = $('div', {class:'rcx-group-stats'}, card);
    const filesEl = $('div', {class:'rcx-files'}, card);
    const errorsEl = $('div', {class:'rcx-errors', style:'display:none'}, card);
    const node = {card, hdr, nameEl, startedEl, bar, barFill, barText, cancel, stats, filesEl, errorsEl};
    groupNodes.set(name, node);
    cancel.onclick = () => {
      if (!jobId || !confirm('Cancel job ' + jobId + '?')) return;
      cancel.disabled = true; cancel.textContent = '...';
      rc('/job/stop', {jobid: jobId})
        .then(() => rc('/core/stats-delete', {group: name}).catch(() => {}))
        .then(() => {
          knownGroups.delete(name);
          groupNodes.get(name)?.card.remove();
          groupNodes.delete(name);
          openErrors.delete(name);
        })
        .catch(e => { alert('Stop failed: ' + (e.message||e)); cancel.disabled = false; cancel.textContent = '\u2715'; });
    };
    return node;
  }

  function renderGroup(name, gs) {
    let node = groupNodes.get(name);
    if (!node) node = buildGroup(name);
    node.card.classList.toggle('empty', !gs);

    if (gs?.elapsedTime > 0) {
      const started = new Date(Date.now() - gs.elapsedTime * 1000);
      const dd = started.getDate();
      const mon = MONTHS[started.getMonth()];
      const hh = String(started.getHours()).padStart(2, '0');
      const mi = String(started.getMinutes()).padStart(2, '0');
      node.startedEl.textContent = `${dd}/${mon} ${hh}:${mi}`;
    } else {
      node.startedEl.textContent = '';
    }

    const gXfr = gs?.bytes || 0;
    const gTotal = gs?.totalBytes || 0;
    const gPct = gTotal > 0 ? Math.floor(gXfr / gTotal * 100) : 0;
    node.barFill.style.width = gPct + '%';
    node.barFill.className = 'rcx-bar-fill' + (gPct >= 99 ? ' ok' : gPct < 5 ? ' warn' : '');
    node.barText.textContent = gTotal > 0
      ? `${fmtB(gXfr)} / ${fmtB(gTotal)} (${gPct}%)`
      : (gs?.transferring?.length ? `active \u00b7 ${gs.transferring.length}` : 'idle');

    // stats row (keyed, persistent)
    const lh = '<span class="rcx-label">';
    setStat(node.stats, 'speed', `${lh}Speed</span> ${fmtSpd(gs?.speed)}`);
    setStat(node.stats, 'eta', `${lh}ETA</span> ${fmtETA(gs?.eta)}`);
    setStat(node.stats, 'xfr', `${lh}Transfer</span> ${gs?.transfers||0}${gs?.totalTransfers?' / '+gs.totalTransfers:''}`);
    setStat(node.stats, 'chk', `${lh}Check</span> ${gs?.checks||0}${gs?.totalChecks?' / '+gs.totalChecks:''}`);
    if (gs?.elapsedTime) setStat(node.stats, 'elapsed', `${lh}Elapsed</span> ${fmtETA(gs.elapsedTime)}`);
    else node.stats.querySelector('[data-key="elapsed"]')?.remove();
    if (gs?.deletes || gs?.deletedDirs)
      setStat(node.stats, 'del', `${lh}Delete</span> ${(gs.deletes||0)+'f '+(gs.deletedDirs||0)+'d'}`);
    else node.stats.querySelector('[data-key="del"]')?.remove();

    if (gs?.errors > 0) {
      setStat(node.stats, 'err', `${lh}Error</span> ${gs.errors}`, 'err clickable');
      node.stats.querySelector('[data-key="err"]').onclick = () => toggleErrors(name, node);
    } else {
      node.stats.querySelector('[data-key="err"]')?.remove();
    }

    // files (keyed by name, persistent bars)
    renderFiles(node, gs?.transferring || []);
  }

  function renderFiles(node, transfers) {
    const filesEl = node.filesEl;
    const seen = new Set();
    // sort by % desc, name asc
    transfers.sort((a,b) => (b.percentage||0) - (a.percentage||0) || String(a.name).localeCompare(String(b.name)));
    for (const t of transfers) {
      const key = t.name || 'unknown';
      seen.add(key);
      let f = filesEl.querySelector(`[data-fname="${CSS.escape(key)}"]`);
      if (!f) {
        f = $('div', {class:'rcx-file', dataset:{fname:key}}, filesEl);
        const top = $('div', {class:'rcx-file-top'}, f);
        $('span', {class:'rcx-fname'}, top).textContent = key;
        const meta = $('span', {class:'rcx-fmeta'}, top);
        const bar = $('div', {class:'rcx-bar'}, f);
        $('div', {class:'rcx-bar-fill'}, bar);
        $('div', {class:'rcx-bar-text'}, bar);
        f._meta = meta; f._bar = bar.querySelector('.rcx-bar-fill'); f._txt = bar.querySelector('.rcx-bar-text');
      }
      filesEl.appendChild(f); // maintain order
      const tPct = Math.max(0, Math.min(100, Math.floor(t.percentage || 0)));
      f._bar.style.width = tPct + '%';
      f._bar.className = 'rcx-bar-fill' + (tPct >= 99 ? ' ok' : tPct < 5 ? ' warn' : '');
      f._meta.textContent = `${fmtB(t.size||0)} \u00b7 ${fmtSpd(t.speed)} \u00b7 ${fmtETA(t.eta)}`;
      f._txt.textContent = `${fmtB(t.bytes||0)} / ${fmtB(t.size||0)} (${tPct}%)`;
    }
    // prune stale
    Array.from(filesEl.children).forEach(c => {
      if (!seen.has(c.dataset.fname)) c.remove();
    });
    filesEl.style.display = seen.size ? '' : 'none';
  }

  function toggleErrors(name, node) {
    if (openErrors.has(name)) {
      openErrors.delete(name);
      node.errorsEl.style.display = 'none';
      return;
    }
    openErrors.add(name);
    node.errorsEl.style.display = '';
    node.errorsEl.innerHTML = '<div class="muted">loading...</div>';
    Promise.all([
      rc('/core/transferred', {group: name}).catch(() => ({transferred: []})),
      rc('/core/stats', {group: name}).catch(() => ({}))
    ]).then(([tr, st]) => {
      const errs = (tr.transferred || []).filter(t => t.error);
      let html;
      if (errs.length > 0) {
        html = errs.map(t => `<div>${esc(t.name)}: ${esc(t.error)}</div>`).join('');
      } else if (st.lastError) {
        html = `<div class="muted">${st.errors||0} errors (retrying, not yet finalized)</div>`
          + `<div>last: ${esc(st.lastError)}</div>`;
      } else {
        html = '<div class="muted">no error log</div>';
      }
      node.errorsEl.innerHTML = html;
    }).catch(() => {
      node.errorsEl.innerHTML = '<div class="muted">unable to fetch</div>';
    });
  }

  async function update() {
    try {
      if (!ensureRoot()) return;
      const [data, glRes] = await Promise.all([
        rc('/core/stats'),
        rc('/core/group-list').catch(() => ({groups: []}))
      ]);
      const transferring = data.transferring || [];
      const checking = data.checking || [];
      knownGroups.clear();
      (glRes.groups || []).forEach(g => knownGroups.add(g));
      transferring.forEach(t => t.group && knownGroups.add(t.group));
      checking.forEach(c => c.group && knownGroups.add(c.group));

      // overall
      const xfr = data.bytes || 0, total = data.totalBytes || 0;
      const pct = total > 0 ? Math.floor(xfr/total*100) : 0;
      overallBarFill.style.width = (total > 0 ? pct : 0) + '%';
      overallBarFill.className = 'rcx-bar-fill' + (pct >= 99 && total > 0 ? ' ok' : '');
      overallBarText.textContent = total > 0
        ? `${fmtB(xfr)} / ${fmtB(total)} (${pct}%)`
        : (transferring.length ? `${transferring.length} active` : 'idle');

      const lh = '<span class="rcx-label">';
      setStat(overallRow, 'speed', `${lh}Speed</span> ${fmtSpd(data.speed)}`);
      setStat(overallRow, 'eta', `${lh}ETA</span> ${fmtETA(data.eta)}`);
      setStat(overallRow, 'xfr',
        `${lh}Transfer</span> ${data.transfers||0}${data.totalTransfers?' / '+data.totalTransfers:''} (${transferring.length} live)`);
      setStat(overallRow, 'chk', `${lh}Check</span> ${data.checks||0}${data.totalChecks?' / '+data.totalChecks:''}`);
      if (data.errors > 0) setStat(overallRow, 'err', `${lh}Error</span> ${data.errors}`, 'err');
      else overallRow.querySelector('[data-key="err"]')?.remove();

      const focused = localStorage.getItem(FOCUS_KEY) === '1';
      setStat(overallRow, 'focus', '', 'rcx-btn ' + (focused ? 'active':''));
      const focusBtn = overallRow.querySelector('[data-key="focus"]');
      focusBtn.textContent = focused ? 'Show All' : 'Focus';
      if (!focusBtn._bound) {
        focusBtn._bound = true;
        focusBtn.onclick = () => {
          localStorage.setItem(FOCUS_KEY, localStorage.getItem(FOCUS_KEY) !== '1' ? '1':'0');
          applyFocus();
        };
      }
      if (!overallRow.querySelector('[data-key="reset"]')) {
        setStat(overallRow, 'reset', '', 'rcx-btn');
        const resetBtn = overallRow.querySelector('[data-key="reset"]');
        resetBtn.textContent = 'Reset';
        resetBtn.onclick = () => {
          if (!confirm('Reset global stats?')) return;
          rc('/core/stats-reset').catch(e => alert('Reset failed: ' + (e.message||e)));
        };
        setStat(overallRow, 'stopall', '', 'rcx-btn rcx-btn-danger');
        const stopBtn = overallRow.querySelector('[data-key="stopall"]');
        stopBtn.textContent = 'Stop All';
        stopBtn.onclick = () => {
          if (!confirm('Stop ALL running jobs?')) return;
          stopBtn.textContent = '...';
          rc('/job/list')
            .then(d => Promise.all((d.runningIds || []).map(id => rc('/job/stop', {jobid: id}).catch(() => {}))))
            .then(() => { stopBtn.textContent = 'done'; setTimeout(() => { stopBtn.textContent = 'Stop All'; }, 2000); })
            .catch(e => { alert('Stop all failed: ' + (e.message||e)); stopBtn.textContent = 'Stop All'; });
        };
      }

      // groups — sort by elapsed time desc (oldest start first), idle last
      const groupList = Array.from(knownGroups);
      const stats = await Promise.all(groupList.map(g =>
        rc('/core/stats', {group: g}).then(s => [g, s]).catch(e => { console.warn('[rcx]', g, e); return [g, null]; })
      ));
      const statsMap = new Map(stats);
      groupList.sort((a, b) => {
        const sa = statsMap.get(a), sb = statsMap.get(b);
        const ea = Math.round((sa?.elapsedTime || 0) / 30) * 30;
        const eb = Math.round((sb?.elapsedTime || 0) / 30) * 30;
        if (ea !== eb) return eb - ea;
        const activeA = sa?.transferring?.length || 0, activeB = sb?.transferring?.length || 0;
        if (activeA !== activeB) return activeB - activeA;
        return a.localeCompare(b);
      });

      // prune gone groups
      for (const name of groupNodes.keys()) {
        if (!knownGroups.has(name)) {
          groupNodes.get(name).card.remove();
          groupNodes.delete(name);
          openErrors.delete(name);
        }
      }
      for (const name of groupList) {
        const gs = statsMap.get(name);
        const wide = (gs?.transferring?.length || 0) >= WIDE_THRESHOLD;
        renderGroup(name, gs);
        const node = groupNodes.get(name);
        (wide ? wideGroupsEl : groupsEl).appendChild(node.card);
      }

      if (idleEl) { idleEl.remove(); idleEl = null; }
      if (groupList.length === 0) {
        idleEl = $('div', {class:'rcx-idle', textContent:'no active jobs'}, groupsEl);
      }
    } catch(e) {
      console.error('[rcx]', e);
    }
  }

  setInterval(update, POLL_MS);
  setTimeout(update, 300);
})();