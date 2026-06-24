// ==UserScript==
// @name         Outlook Unread Count
// @version      1.0
// @description  Adds unread count to tab title
// @match        https://outlook.office365.com/mail/*
// @match        https://outlook.live.com/mail/*
// @match        https://outlook.office.com/mail/*
// @grant        none
// ==/UserScript==

(function() {
  'use strict';
  if (window.top !== window.self) return;

  const TAG = '[unread-count]';
  const POLL_MS = 3000;
  let baseTitle = null;

  function getUnreadCount() {
    let total = 0;
    for (const el of document.querySelectorAll('[data-folder-name]')) {
      if (/deleted/i.test(el.dataset.folderName)) continue;
      // Unread count lives in a span whose textContent ends with "unread",
      // with the digit in a sibling/child span. Find spans containing "unread"
      // inside this folder element, then grab the preceding numeric span.
      for (const span of el.querySelectorAll('span')) {
        if (!/^\d+$/.test(span.textContent.trim())) continue;
        const parent = span.parentElement;
        if (parent && /unread/i.test(parent.textContent)) {
          total += parseInt(span.textContent.trim(), 10);
        }
      }
    }
    return total;
  }

  function update() {
    if (!baseTitle) {
      const m = document.title.match(/(?:\(\d+\)\s*)?(.+)/);
      baseTitle = m ? m[1] : document.title;
    }
    const count = getUnreadCount();
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
  }

  function waitForApp() {
    if (document.querySelector('[data-folder-name]')) {
      console.log(TAG, 'started');
      update();
      setInterval(update, POLL_MS);
      return;
    }
    setTimeout(waitForApp, 1000);
  }

  waitForApp();
})();
