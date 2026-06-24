// ==UserScript==
// @name        Outlook Unread Count
// @description Adds unread count to tab title
// @version     1.0
// @homepageURL https://github.com/nnyj/user-scripts/tree/main/outlook-unread-count
// @updateURL   https://raw.githubusercontent.com/nnyj/user-scripts/main/outlook-unread-count/outlook-unread-count.user.js
// @icon        https://outlook.live.com/favicon.ico
// @match       https://outlook.office365.com/mail/*
// @match       https://outlook.live.com/mail/*
// @match       https://outlook.office.com/mail/*
// @grant       none
// ==/UserScript==

(function() {
  'use strict';
  if (window.top !== window.self) return;

  const POLL_MS = 3000;

  function getUnreadCount() {
    let total = 0;
    for (const el of document.querySelectorAll('[data-folder-name]')) {
      if (/deleted/i.test(el.dataset.folderName)) continue;
      // Digit span sits inside a parent whose textContent contains "unread",
      // e.g. <span><span>3</span>unread</span> — all mashed with no spaces.
      // Break after first match per folder to avoid double-counting nested spans.
      for (const span of el.querySelectorAll('span')) {
        if (!/^\d+$/.test(span.textContent.trim())) continue;
        const parent = span.parentElement;
        if (parent && /unread/i.test(parent.textContent)) {
          total += parseInt(span.textContent.trim(), 10);
          break;
        }
      }
    }
    return total;
  }

  function update() {
    const baseTitle = document.title.replace(/^\(\d+\)\s*/, '');
    const count = getUnreadCount();
    document.title = count > 0 ? `(${count}) ${baseTitle}` : baseTitle;
  }

  function waitForApp() {
    if (document.querySelector('[data-folder-name]')) {
      update();
      setInterval(update, POLL_MS);
      return;
    }
    setTimeout(waitForApp, 1000);
  }

  waitForApp();
})();
