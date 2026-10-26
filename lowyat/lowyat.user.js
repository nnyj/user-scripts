// ==UserScript==
// @name        Lowyat
// @namespace   https://github.com/nnyj/user-scripts
// @version     1.1.0
// @description Dense dark topic and search pages on forum.lowyat.net: one-line post headers, quotes collapsed to chips, reply links.
// @match       https://forum.lowyat.net/*
// @grant       none
// @run-at      document-start
// ==/UserScript==

(() => {
  const EXCERPT_LENGTH = 120;
  // The site sets most sizes in px, so zoom is the only way to enlarge everything.
  const PAGE_ZOOM = 1.15;
  const HIDE_LOCKED_KEY = 'lyc_hide_locked';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  // Colors from redditPlusPlus RES night mode.
  const style = document.createElement('style');
  style.textContent = `
    html.lyc { --lyc-even: #161616; --lyc-odd: #121212; --lyc-border: #4a4a4a; --lyc-head: #222222; --lyc-head-border: #333333;
      --lyc-text: #dedede; --lyc-dim: #828282; --lyc-link: #8cb3d9; --lyc-op: #4584f6; --lyc-target: #ff9700;
      --lyc-quote: #222a33; --lyc-quote-bar: #5b8dd6; --lyc-quote-text: #c8c8c8; }
    html.lyc body { background: #0e0e0e !important; zoom: ${PAGE_ZOOM}; }
    html.lyc.lyc-hide-locked #forum_topic_list tr:has(.ipb-icon .fa-lock) { display: none; }
    html.lyc .post_table { width: 100%; margin: 0 0 8px; border: 1px solid var(--lyc-border);
      border-radius: 3px; border-spacing: 0; background: var(--lyc-even); }
    html.lyc .post_table.lyc-odd { background: var(--lyc-odd); }
    html.lyc .post_table.lyc-op { border-left: 3px solid var(--lyc-op); }
    html.lyc .post_table:target { border-color: var(--lyc-target); }
    html.lyc .post_table > tbody > tr > td { padding: 2px 6px; border: 0 !important; background: transparent !important; }
    html.lyc .post_table > tbody > tr:first-child > td.lyc-head-cell { background: var(--lyc-head) !important;
      border-bottom: 1px solid var(--lyc-head-border) !important; }
    html.lyc .post_table .post_td_left, html.lyc .post_table .catend,
    html.lyc .lyc-result-wrap > .maintitle, html.lyc .lyc-result-wrap + br,
    html.lyc .lyc-result tr > td:first-child, html.lyc .lyc-result tr:last-child,
    html.lyc .post_table tr:first-child > .lyc-head-cell > :not(.lyc-head),
    html.lyc .post_table .formbuttonrow > div[style*="float"],
    html.lyc .post_table img[name^="mad_"],
    html.lyc .post_table .reactionsBar, html.lyc .post_table .signature { display: none !important; }
    html.lyc :is(.style_ad, #LYNBillboard, [id^="div-gpt-ad"], ins.adsbygoogle, #lmg-rail-wrap) { display: none !important; }

    html.lyc .lyc-head { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; padding-top: 2px;
      font: 12px/18px system-ui, sans-serif; color: var(--lyc-dim); }
    html.lyc .lyc-head .normalname a { color: #fff !important; font-weight: 700; font-size: 13px; }
    html.lyc .lyc-head a { color: var(--lyc-dim) !important; }
    html.lyc .lyc-head .btn-ts { margin-right: 4px; padding: 0; background: none; color: #0079d3; font: 700 12px system-ui, sans-serif; }
    html.lyc .lyc-head .lyc-likes { color: #c6c6c6; font-weight: 600; }
    html.lyc .lyc-head :is(.lyc-likes, .lyc-replies):empty { display: none; }
    html.lyc .lyc-head .lyc-num { margin-left: auto; }
    html.lyc .lyc-head a.lyc-topic { color: var(--lyc-link) !important; font-weight: 600; }

    html.lyc .lyc-result-wrap { margin: 0; border: 0; background: none; }
    /* The site caps each search result at 200px with a scroll box. */
    html.lyc .lyc-result .post_text { height: auto !important; overflow: visible !important; }
    html.lyc .post_text .searchlite { background: #4a3b00 !important; color: #ffd866 !important; }

    html.lyc .post_text { font: 14px/19px system-ui, sans-serif; color: var(--lyc-text); }
    html.lyc .post_text a { color: var(--lyc-link) !important; }

    html.lyc .post_text .quotetop.lyc-chip { display: block; margin: 0 0 2px; padding: 1px 6px; border: 0; border-left: 3px solid var(--lyc-quote-bar);
      border-radius: 3px; background: var(--lyc-quote) !important; color: #9a9a9a; font: 12px/18px system-ui, sans-serif;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; }
    /* Short quotes don't expand, so they wrap instead of losing their end on narrow screens. */
    html.lyc .post_text .lyc-chip.lyc-short { cursor: default; white-space: normal; }
    html.lyc .post_text .lyc-chip:not(.lyc-short):hover { background: #2a3440 !important; }
    html.lyc .post_text .lyc-chip .lyc-caret { display: inline-block; width: 14px; color: var(--lyc-quote-bar); }
    html.lyc .post_text .lyc-chip:not(.lyc-short) .lyc-caret { font-size: 10px; }
    html.lyc .post_text .lyc-chip.lyc-chip-open { margin-bottom: 0; border-radius: 3px 3px 0 0; }
    html.lyc .post_text .lyc-chip.lyc-chip-open .lyc-excerpt { display: none; }
    html.lyc .post_text .lyc-chip a { color: #c8d8ec !important; font-weight: 600; }
    html.lyc .post_text .quotemain { display: none; }
    html.lyc .post_text .quotemain.lyc-open { display: block; margin: 0 0 4px; padding: 4px 8px; border: 0; border-left: 3px solid var(--lyc-quote-bar);
      border-radius: 0 0 3px 3px; background: var(--lyc-quote) !important; font: 13px/18px system-ui, sans-serif; }
    /* Quoted text keeps the colors of its own inner elements unless forced. */
    html.lyc .post_text .quotemain.lyc-open, html.lyc .post_text .quotemain.lyc-open :not(a) { color: var(--lyc-quote-text) !important; }

    html.lyc .lyc-page { display: block; margin: 0 0 8px; padding: 2px 6px; border-bottom: 1px solid var(--lyc-border);
      color: var(--lyc-dim); font: 600 12px/18px system-ui, sans-serif; }
    html.lyc .lyc-load { display: block; width: 100%; margin: 0 0 8px; padding: 6px; border: 1px solid var(--lyc-border); border-radius: 3px;
      background: var(--lyc-head); color: var(--lyc-link); font: 600 13px system-ui, sans-serif; cursor: pointer; }
    html.lyc .lyc-load:hover { background: #2a2a2a; }
    html.lyc .lyc-load[hidden] { display: none; }
    html.lyc .lyc-load:disabled { opacity: .5; cursor: default; }

    html.lyc .post_table.lyc-flash { animation: lyc-flash 2s ease-out; }
    @keyframes lyc-flash { from { box-shadow: 0 0 0 3px var(--lyc-target); } to { box-shadow: 0 0 0 3px transparent; } }
    html.lyc .lyc-back { position: fixed; right: 16px; bottom: 16px; z-index: 9999; padding: 6px 12px; border: 1px solid var(--lyc-target);
      border-radius: 3px; background: var(--lyc-head); color: #fff; font: 600 13px system-ui, sans-serif; cursor: pointer; }
    html.lyc .lyc-back[hidden] { display: none; }

    html.lyc .post_table > tbody > tr > td.formbuttonrow { height: auto; padding: 0 6px 2px !important; line-height: 16px; opacity: .35; transition: opacity .15s; }
    html.lyc .post_table:hover .formbuttonrow { opacity: 1; }
    /* Touch screens have no hover and the mobile site already fits the screen. */
    @media (hover: none) {
      html.lyc body { zoom: 1; }
      html.lyc .post_table > tbody > tr > td.formbuttonrow { opacity: 1; }
    }
    html.lyc .post_table .formbuttonrow :is(.btnsubblue, .btnhide) { padding: 0 4px; border: 0; background: none;
      color: var(--lyc-dim); font: 600 12px system-ui, sans-serif; }
    html.lyc .post_table :is(a.btn-quoteoff, a.btn-quoteon) { background: none; }
    html.lyc .post_table a.btn-quoteon .btnhide { color: var(--lyc-target); }
  `;

  // At document-start the <html> element can still be missing.
  function on_root(callback) {
    if (document.documentElement) return callback();
    new MutationObserver((_, observer) => {
      if (!document.documentElement) return;
      observer.disconnect();
      callback();
    }).observe(document, { childList: true });
  }

  // The site ships a full dark theme behind `data-theme`, its toggle is disabled for now.
  on_root(() => {
    document.documentElement.setAttribute('data-theme', 'dark');
    document.documentElement.classList.add('lyc');
    // Locked topics are hidden unless the reader chose to show them.
    document.documentElement.classList.toggle('lyc-hide-locked', localStorage.getItem(HIDE_LOCKED_KEY) !== '0');
    document.documentElement.append(style);
  });

  // Builds nodes without innerHTML.
  function el(tag, props = {}, ...children) {
    const node = Object.assign(document.createElement(tag), props);
    node.append(...children);
    return node;
  }

  // Dates read `Oct 15 2026, 10:04 PM`, `Today, 10:04 PM` or `Yesterday, 10:04 PM`.
  function parse_date(text) {
    const match = text.match(/(?:Today|Yesterday|(\w{3}) (\d{1,2}) (\d{4})), (\d{1,2}):(\d{2}) (AM|PM)/);
    if (!match) return null;
    const [, month, day, year, hour, minute, half] = match;
    const date = new Date();
    if (month) date.setFullYear(+year, MONTHS.indexOf(month), +day);
    if (match[0].startsWith('Yesterday')) date.setDate(date.getDate() - 1);
    date.setHours(+hour % 12 + (half === 'PM' ? 12 : 0), +minute, 0, 0);
    return date;
  }

  function time_ago(date) {
    const minutes = Math.floor((Date.now() - date) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    if (days < 365) return `${Math.floor(days / 30)}mo ago`;
    return `${Math.floor(days / 365)}y ago`;
  }

  // The reactions bar reads `a, b and 3 others liked this post`.
  function like_count(post) {
    const bar = post.querySelector('.reactionsBar');
    if (!bar) return 0;
    const others = bar.textContent.match(/(\d+) others?/);
    return bar.querySelectorAll('a').length + (others ? +others[1] : 0);
  }

  function update_likes(post) {
    const count = like_count(post);
    const badge = post.querySelector('.lyc-likes');
    badge.textContent = count ? `👍 ${count}` : '';
    badge.title = post.querySelector('.reactionsBar')?.textContent.trim() ?? '';
  }

  // Joins text nodes with spaces, so lines split by <br> stay apart.
  function text_of(node) {
    const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
    const parts = [];
    while (walker.nextNode()) parts.push(walker.currentNode.textContent);
    return parts.join(' ').replace(/\s+/g, ' ').trim();
  }

  // Most posts end with <br> tags and an attachment comment, which add empty lines above the buttons.
  function trim_trailing_breaks(body) {
    let node = body.lastChild;
    while (node) {
      const previous = node.previousSibling;
      const blank_text = node.nodeType === Node.TEXT_NODE && !node.textContent.trim();
      if (node.nodeName === 'BR') node.remove();
      else if (!blank_text && node.nodeType !== Node.COMMENT_NODE) break;
      node = previous;
    }
  }

  function post_link(pid) {
    return document.getElementById(`post_${pid}`) ? `#post_${pid}` : `/index.php?act=findpost&pid=${pid}`;
  }

  // Quote header reads `QUOTE(author @ date)`, the snapback link at the end of the body holds the quoted post id.
  function collapse_quote(top) {
    const main = top.nextElementSibling;
    if (!main?.classList.contains('quotemain')) return null;
    const snapback = main.querySelector('a[href*="act=findpost"]');
    const pid = snapback?.href.match(/pid=(\d+)/)?.[1];
    const author = top.textContent.match(/QUOTE\((.+?) @/)?.[1];
    const text = text_of(main);
    const is_short = text.length <= EXCERPT_LENGTH;
    const excerpt = is_short ? text : `${text.slice(0, EXCERPT_LENGTH)}…`;
    let source = 'quote';
    if (pid && author) {
      source = el('a', { href: post_link(pid), textContent: author });
      // Read again by link_posts, the quoted post can arrive later with another page.
      source.dataset.lycPid = pid;
    }
    top.classList.add('lyc-chip');
    top.title = top.textContent;
    // `▶` marks a quote that expands, a short quote fits in the chip and keeps `↪`.
    const caret = el('span', { className: 'lyc-caret', textContent: is_short ? '↪' : '▶' });
    top.replaceChildren(caret, source, el('span', { className: 'lyc-excerpt', textContent: `: ${excerpt}` }));
    if (is_short) {
      top.classList.add('lyc-short');
    } else {
      top.addEventListener('click', (event) => {
        if (event.target.closest('a')) return;
        const open = main.classList.toggle('lyc-open');
        top.classList.toggle('lyc-chip-open', open);
        caret.textContent = open ? '▼' : '▶';
      });
    }
    return pid;
  }

  // Rank, post count and join date sit in text nodes between <br> tags.
  function profile_title(details) {
    const lines = details ? [...details.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE) : [];
    return lines.map((node) => node.textContent.trim()).filter(Boolean).join(' · ');
  }

  function build_head(post) {
    const [head_row, body_row] = post.rows;
    const left = head_row.cells[0];
    // The mobile site puts author, date and post number in one header cell.
    const right = head_row.cells[1] ?? left;
    right.classList.add('lyc-head-cell');
    // Mobile date text ends with `Post #N`.
    const details = right.querySelector('.postdetails')?.textContent ?? '';
    const date_text = details.replace(/\s+/g, ' ').replace(/ Post #\d+\s*$/, '').trim();
    const date = parse_date(date_text);
    const author = left.querySelector('.normalname');
    author.title = profile_title(body_row.cells[0].querySelector('.avatar_extra'));
    const head = el('div', { className: 'lyc-head' },
      ...left.querySelectorAll('a[name^="entry"]'),
      author,
      el('span', { textContent: date ? time_ago(date) : date_text, title: date_text }),
      el('span', { className: 'lyc-likes' }),
      el('span', { className: 'lyc-replies' }),
      el('span', { className: 'lyc-num' }, right.querySelector('a[onclick^="link_to_post"]') ?? ''));
    right.append(head);
  }

  // Each search result is a `.borderwrap` with the topic title and rows for author and date, avatar and post, forum and post link.
  function process_results() {
    const results = [...document.querySelectorAll('.borderwrap')].filter((result) => result.querySelector('.linkthru'));
    results.forEach((result, index) => {
      const table = result.querySelector('table');
      const [head_row, body_row, foot_row] = table.rows;
      result.classList.add('lyc-result-wrap');
      table.classList.add('post_table', 'lyc-result');
      table.classList.toggle('lyc-odd', index % 2 === 1);
      const head_cell = head_row.cells[1];
      head_cell.classList.add('lyc-head-cell');
      const date_text = head_cell.textContent.replace(/\s+/g, ' ').replace('Posted on:', '').trim();
      const date = parse_date(date_text);
      const author = head_row.cells[0].querySelector('.normalname');
      author.title = profile_title(body_row.cells[0].querySelector('.postdetails'));
      const topic = result.querySelector('.maintitle a');
      topic.classList.add('lyc-topic');
      const post_number = foot_row.querySelector('.linkthru');
      post_number.target = '_blank';
      head_cell.append(el('div', { className: 'lyc-head' },
        author,
        el('span', { textContent: date ? time_ago(date) : date_text, title: date_text }),
        topic,
        foot_row.querySelector('a[href*="showforum="]') ?? '',
        el('span', { className: 'lyc-num' }, post_number)));
      const body = body_row.cells[1].querySelector('.postcolor');
      body.classList.add('post_text');
      trim_trailing_breaks(body);
      for (const top of body.querySelectorAll('.quotetop')) collapse_quote(top);
    });
    return results.length;
  }

  const POST = 'table[id^="post_"]';
  const replies = new Map();
  // `st` offsets of the first and last loaded page.
  const pager = { topic: '', size: 20, pages: 1, first: 0, last: 0 };
  const buttons = {};

  function all_posts() {
    return [...document.querySelectorAll(POST)];
  }

  function process_posts(posts) {
    for (const post of posts) {
      // Posts by banned users render with an empty class.
      post.classList.add('post_table');
      // The site marks every topic starter post with a `TS` badge, on all pages.
      post.classList.toggle('lyc-op', !!post.querySelector('.normalname .btn-ts'));
      build_head(post);
      const pid = post.id.replace('post_', '');
      const author = post.querySelector('.normalname a')?.textContent.trim() ?? '';
      trim_trailing_breaks(post.querySelector('.post_text'));
      const parents = new Set();
      for (const top of post.querySelectorAll('.post_text .quotetop')) {
        const parent = collapse_quote(top);
        if (parent) parents.add(parent);
      }
      for (const parent of parents) {
        if (!replies.has(parent)) replies.set(parent, []);
        replies.get(parent).push({ pid, author });
      }
      update_likes(post);
      new MutationObserver(() => update_likes(post)).observe(post.querySelector('.post_text').parentElement, { childList: true, subtree: true });
    }
  }

  function restripe() {
    all_posts().forEach((post, index) => post.classList.toggle('lyc-odd', index % 2 === 1));
  }

  // Runs after every page load, so reply links and quote chips reach posts on all loaded pages.
  function link_posts() {
    for (const post of all_posts()) {
      const children = replies.get(post.id.replace('post_', '')) ?? [];
      const links = children.flatMap(({ pid, author }, index) => [index ? ', ' : '↩ ', el('a', { href: `#post_${pid}`, textContent: author })]);
      post.querySelector('.lyc-replies').replaceChildren(...links);
    }
    for (const link of document.querySelectorAll('a[data-lyc-pid]')) {
      link.href = post_link(link.dataset.lycPid);
      // A post that isn't loaded opens in a new tab, so the loaded pages stay.
      link.target = link.href.includes('findpost') ? '_blank' : '';
    }
  }

  function page_number(st) {
    return Math.floor(st / pager.size) + 1;
  }

  function page_marker(st) {
    return el('div', { className: 'lyc-page', textContent: `Page ${page_number(st)}` });
  }

  function update_buttons() {
    buttons.prev.hidden = pager.first <= 0;
    buttons.prev.textContent = `▲ Load page ${page_number(pager.first) - 1}`;
    buttons.next.hidden = pager.last >= (pager.pages - 1) * pager.size;
    buttons.next.textContent = `▼ Load page ${page_number(pager.last) + 1}`;
  }

  async function load_page(direction) {
    const button = direction < 0 ? buttons.prev : buttons.next;
    const st = direction < 0 ? Math.max(0, pager.first - pager.size) : pager.last + pager.size;
    button.disabled = true;
    button.textContent = 'Loading…';
    try {
      const response = await fetch(`/topic/${pager.topic}/+${st}`);
      const page = new DOMParser().parseFromString(await response.text(), 'text/html');
      // Pages shift when posts are added or deleted, so skip posts already shown.
      const fresh = [...page.querySelectorAll(POST)].filter((post) => !document.getElementById(post.id));
      const posts = fresh.map((post) => document.adoptNode(post));
      // Processed before insertion, so posts don't shrink after the scroll position is fixed.
      process_posts(posts);
      if (direction < 0) {
        const anchor = buttons.prev.nextElementSibling;
        const top_before = anchor.getBoundingClientRect().top;
        buttons.prev.after(page_marker(st), ...posts);
        // The clicked button could become the browser's scroll anchor, so keep the old top post in place by hand.
        window.scrollBy(0, anchor.getBoundingClientRect().top - top_before);
        pager.first = st;
      } else {
        buttons.next.before(page_marker(st), ...posts);
        pager.last = st;
      }
      restripe();
      link_posts();
      // Site hooks that set multiquote button state and render social embeds.
      window.onloadChangecls?.();
      window.reprocessSocialEmbeds?.(document.getElementById('topic_content'));
    } finally {
      button.disabled = false;
      update_buttons();
    }
  }

  function add_pager(posts) {
    const match = location.pathname.match(/^\/topic\/(\d+)(?:\/\+(\d+))?/);
    if (!match) return;
    // Desktop pages use `.pgn-pop`, mobile pages use `.pgn-data`.
    const pagination = document.querySelector('.pgn-pop, .pgn-data');
    pager.topic = match[1];
    pager.size = +(pagination?.dataset.pp ?? 20);
    pager.pages = +(pagination?.dataset.pages ?? 1);
    pager.first = pager.last = +(match[2] ?? 0);
    buttons.prev = el('button', { className: 'lyc-load', onclick: () => load_page(-1) });
    buttons.next = el('button', { className: 'lyc-load', onclick: () => load_page(1) });
    posts[0].before(buttons.prev, page_marker(pager.first));
    posts.at(-1).after(buttons.next);
    update_buttons();
  }

  const back = el('button', { className: 'lyc-back', hidden: true });
  let back_to = null;

  function flash(post) {
    post.classList.remove('lyc-flash');
    // Reading offsetWidth restarts the animation when the same post flashes twice.
    void post.offsetWidth;
    post.classList.add('lyc-flash');
  }

  function show_post(post) {
    post.scrollIntoView({ block: 'center' });
    flash(post);
  }

  // Quote and reply links scroll to loaded posts and offer a way back to the post the reader came from.
  function on_post_link(event) {
    const link = event.target.closest('a[data-lyc-pid], .lyc-replies a');
    const href = link?.getAttribute('href') ?? '';
    const target = href.startsWith('#post_') && document.querySelector(href);
    if (!target) return;
    event.preventDefault();
    back_to = link.closest(POST);
    back.textContent = `↩ Back to ${back_to.querySelector('.lyc-num a')?.textContent ?? 'post'}`;
    back.hidden = false;
    show_post(target);
  }

  back.addEventListener('click', () => {
    back.hidden = true;
    show_post(back_to);
  });

  // Adds `Hide N locked` to the topic list title bar, next to `Mark this forum as read`.
  function add_locked_toggle() {
    const list = document.getElementById('forum_topic_list');
    const locked = list?.querySelectorAll('tr .ipb-icon .fa-lock').length;
    if (!locked) return;
    const toggle = el('a', { href: '#' });
    function render() {
      const hidden = document.documentElement.classList.contains('lyc-hide-locked');
      toggle.textContent = `${hidden ? 'Show' : 'Hide'} ${locked} locked`;
    }
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      const hidden = document.documentElement.classList.toggle('lyc-hide-locked');
      localStorage.setItem(HIDE_LOCKED_KEY, hidden ? '1' : '0');
      render();
    });
    const title = list.querySelector('.maintitle-right') ?? list.querySelector('.maintitle');
    title.prepend(toggle, ' · ');
    render();
  }

  function main() {
    document.head.append(style);
    const posts = all_posts();
    add_locked_toggle();
    if (process_results()) link_posts();
    if (!posts.length) return;
    process_posts(posts);
    restripe();
    link_posts();
    add_pager(posts);
    document.body.append(back);
    document.addEventListener('click', on_post_link);
  }

  document.addEventListener('DOMContentLoaded', main);
})();
