// ==UserScript==
// @name        Outlook Junk Auto-Delete
// @namespace   Violentmonkey Scripts
// @match       https://outlook.live.com/mail/*
// @grant       unsafeWindow
// @icon        https://outlook.live.com/favicon.ico
// @version     6.1
// @run-at      document-start
// ==/UserScript==

// Auth format: MSAuth1.0 usertoken="<token>", type="MSACT"
// Token source: MSAL cache in localStorage (scope: outlook.office.com)
// CSRF: X-OWA-CANARY cookie

(function() {
  'use strict';

  // --- config ---
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

  // --- read MSAL token from localStorage ---
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

  // --- OWA service.svc ---
  async function owaPost(action, body) {
    const token = getToken();
    if (!token) { console.log('[junk-autodelete] no token'); return null; }
    const canary = getCanary();
    if (!canary) { console.log('[junk-autodelete] no canary'); return null; }

    const n = Math.floor(Math.random() * 100);
    const url = `https://outlook.live.com/owa/0/service.svc?action=${action}&app=Mail&n=${n}`;
    const reqHeaders = {
      'authorization': `MSAuth1.0 usertoken="${token}", type="MSACT"`,
      'action': action,
      'content-type': 'application/json; charset=utf-8',
      'x-owa-canary': canary,
      'x-owa-urlpostdata': encodeURIComponent(JSON.stringify(body)),
      'x-req-source': 'Mail',
    };

    const res = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      headers: reqHeaders,
    });

    const json = res.ok ? await res.json() : null;

    if (!res.ok) {
      console.error(`[junk-autodelete] ${action}: ${res.status}`);
      return null;
    }
    return json;
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

  async function runCleanup() {
    const ts = new Date().toLocaleTimeString();
    try {
      const res = await findJunk();
      if (!res) return;

      const msgs = res?.Body?.ResponseMessages?.Items ?? [];
      const toDelete = [];
      const senderLog = [];

      for (const msg of msgs) {
        for (const item of (msg?.RootFolder?.Items ?? [])) {
          const name = item?.From?.Mailbox?.Name ?? item?.Sender?.Mailbox?.Name ?? '';
          if (isMatch(name)) {
            toDelete.push(item.ItemId.Id);
            senderLog.push(name);
          }
        }
      }

      const total = msgs.reduce((n, m) => n + (m?.RootFolder?.TotalItemsInView ?? 0), 0);
      console.log(`[junk-autodelete] ${ts} | junk: ${total} | matched: ${toDelete.length}`, senderLog);

      if (!toDelete.length) return;
      const del = await deleteItems(toDelete);
      const ok = del?.Body?.ResponseMessages?.Items?.every(i => i.ResponseClass === 'Success');
      console.log(`[junk-autodelete] ${ts} | deleted ${toDelete.length}: ${ok ? 'ok' : 'FAIL'}`);
    } catch(e) {
      console.error(`[junk-autodelete] ${ts} |`, e);
    }
  }

  function startInterval() {
    const ms = document.hidden ? INTERVAL_BG : INTERVAL_FG;
    return setInterval(runCleanup, ms);
  }

  setTimeout(() => {
    runCleanup();
    timer = startInterval();
  }, 5000);
  let timer = null;

  document.addEventListener('visibilitychange', () => {
    clearInterval(timer);
    if (!document.hidden) runCleanup();
    timer = startInterval();
  });
})();
