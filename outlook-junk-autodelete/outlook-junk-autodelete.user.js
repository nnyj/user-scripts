// ==UserScript==
// @name        Outlook Junk Auto-Delete
// @description Auto-deletes junk emails from known spam senders
// @version     6.1
// @homepageURL https://github.com/nnyj/user-scripts/tree/main/outlook-junk-autodelete
// @updateURL   https://raw.githubusercontent.com/nnyj/user-scripts/main/outlook-junk-autodelete/outlook-junk-autodelete.user.js
// @icon        https://outlook.live.com/favicon.ico
// @match       https://outlook.live.com/mail/*
// @grant       unsafeWindow
// @run-at      document-start
// ==/UserScript==

// Auth: MSAuth1.0 usertoken from MSAL cache in localStorage
// CSRF: X-OWA-CANARY cookie

(function() {
  'use strict';
  if (window.top !== window.self) return;

  const TAG = '[junk-autodelete]';
  const INTERVAL_FG = 60 * 1000;
  const INTERVAL_BG = 300 * 1000;
  const MAX_ITEMS   = 50;
  const SENDERS = [
    'marriott',
    "sam's club giveaway",
    'state farm',
    'platinum windows',
    'wealthsimple compliance',
    'american gutter pros',
    'american home shield warranty',
    'trimrx support'
  ];

  const isMatch = name =>
    SENDERS.some(s => (name || '').toLowerCase().includes(s));

  function getToken() {
    const ls = unsafeWindow.localStorage;
    for (let i = 0; i < ls.length; i++) {
      const key = ls.key(i);
      if (!key.includes('accesstoken') || !key.includes('outlook.office.com')) continue;
      try {
        const val = JSON.parse(ls.getItem(key));
        if (val?.secret?.length > 100) return val.secret;
      } catch { /* skip */ }
    }
    return null;
  }

  function getCanary() {
    const m = document.cookie.match(/X-OWA-CANARY=([^;]+)/);
    return m?.[1] || null;
  }

  async function owaPost(action, body) {
    const token = getToken();
    if (!token) { console.log(TAG, 'no token'); return null; }
    const canary = getCanary();
    if (!canary) { console.log(TAG, 'no canary'); return null; }

    const n = Math.floor(Math.random() * 100);
    const url = `https://outlook.live.com/owa/0/service.svc?action=${action}&app=Mail&n=${n}`;
    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'authorization': `MSAuth1.0 usertoken="${token}", type="MSACT"`,
        'action': action,
        'content-type': 'application/json; charset=utf-8',
        'x-owa-canary': canary,
        'x-owa-urlpostdata': encodeURIComponent(JSON.stringify(body)),
        'x-req-source': 'Mail',
      },
    });

    if (!res.ok) {
      console.error(TAG, `${action}: ${res.status}`);
      return null;
    }
    return res.json();
  }

  const header = {
    "__type": "JsonRequestHeaders:#Exchange",
    "RequestServerVersion": "V2018_01_08",
    "TimeZoneContext": {
      "__type": "TimeZoneContext:#Exchange",
      "TimeZoneDefinition": { "__type": "TimeZoneDefinitionType:#Exchange", "Id": "UTC" },
    },
  };

  async function findJunk() {
    return owaPost('FindItem', {
      "__type": "FindItemJsonRequest:#Exchange",
      "Header": header,
      "Body": {
        "__type": "FindItemRequest:#Exchange",
        "ItemShape": { "__type": "ItemResponseShape:#Exchange", "BaseShape": "Default" },
        "ParentFolderIds": [{ "__type": "DistinguishedFolderId:#Exchange", "Id": "junkemail" }],
        "Traversal": "Shallow",
        "Paging": {
          "__type": "IndexedPageView:#Exchange",
          "BasePoint": "Beginning",
          "Offset": 0,
          "MaxEntriesReturned": MAX_ITEMS,
        },
      },
    });
  }

  async function deleteItems(ids) {
    return owaPost('DeleteItem', {
      "__type": "DeleteItemJsonRequest:#Exchange",
      "Header": header,
      "Body": {
        "__type": "DeleteItemRequest:#Exchange",
        "ItemIds": ids.map(id => ({ "__type": "ItemId:#Exchange", "Id": id })),
        "DeleteType": "SoftDelete",
        "SuppressReadReceipts": true,
        "ReturnMovedItemIds": true,
        "SendMeetingCancellations": "SendToNone",
        "AffectedTaskOccurrences": "AllOccurrences",
      },
    });
  }

  let running = false;
  async function runCleanup() {
    if (running) return;
    running = true;
    const ts = new Date().toLocaleTimeString();
    try {
      const res = await findJunk();
      if (!res) return;

      // OWA wraps results in ResponseMessages > Items[] > RootFolder > Items[]
      const msgs = res?.Body?.ResponseMessages?.Items ?? [];
      const toDelete = [];
      const senderLog = [];

      for (const msg of msgs) {
        for (const item of (msg?.RootFolder?.Items ?? [])) {
          const name = item?.From?.Mailbox?.Name ?? item?.Sender?.Mailbox?.Name ?? '';
          const id = item?.ItemId?.Id;
          if (id && isMatch(name)) {
            toDelete.push(id);
            senderLog.push(name);
          }
        }
      }

      const total = msgs.reduce((n, m) => n + (m?.RootFolder?.TotalItemsInView ?? 0), 0);
      console.log(TAG, `${ts} | junk: ${total} | matched: ${toDelete.length}`, senderLog);

      if (!toDelete.length) return;
      const del = await deleteItems(toDelete);
      if (!del) { console.log(TAG, `${ts} | delete request failed`); return; }
      const ok = del.Body?.ResponseMessages?.Items?.every(i => i.ResponseClass === 'Success');
      console.log(TAG, `${ts} | deleted ${toDelete.length}: ${ok ? 'ok' : 'FAIL'}`);
    } catch(e) {
      console.error(TAG, `${ts} |`, e);
    } finally {
      running = false;
    }
  }

  // Polls faster when tab is focused, slower when backgrounded
  function startInterval() {
    const ms = document.hidden ? INTERVAL_BG : INTERVAL_FG;
    return setInterval(runCleanup, ms);
  }

  let timer = null;
  setTimeout(() => {
    runCleanup();
    timer = startInterval();
  }, 5000);

  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) runCleanup();
    timer = startInterval();
  });
})();
