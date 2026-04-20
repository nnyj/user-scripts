import { SITE_CONFIGS } from './config.js';
import { detectMainContent, detectComments } from './detect.js';
import * as storage from '../adapters/storage.js';

function queryEls(sel) {
  try {
    return [...document.querySelectorAll(sel)]
      .map(el => el.innerText.trim()).filter(t => t.length > 10);
  } catch (e) { console.warn('[AIS] queryEls:', e); return []; }
}

function joinSections(post, comments) {
  return [post, comments && '=== Comments ===\n\n' + comments].filter(Boolean).join('\n\n');
}

function isDiscourse() {
  return !!document.querySelector('meta[name="generator"][content^="Discourse"]')
    || !!document.querySelector('.discourse-root, #discourse-main')
    || document.body.classList.contains('discourse');
}

async function extractDiscourse() {
  try {
    const m = location.pathname.match(/\/t\/[^/]+\/(\d+)/);
    if (m) {
      const data = await (await fetch(`/t/${m[1]}.json`)).json();
      const posts = data.post_stream?.posts
        ?.map(p => {
          const d = new DOMParser().parseFromString(p.cooked || '', 'text/html');
          return d.body.textContent.replace(/\s+/g, ' ').trim();
        })
        .filter(t => t?.length > 10)
        .slice(0, 100);
      if (posts?.length) {
        const [first, ...rest] = posts;
        return joinSections(first, rest.join('\n---\n'));
      }
    }
  } catch (e) { console.warn('[AIS] extractDiscourse:', e); }
  const posts = queryEls('.topic-post .cooked, .post-stream .cooked');
  if (!posts.length) return '';
  const [first, ...rest] = posts;
  return joinSections(first, rest.join('\n---\n'));
}

export async function getSiteConfigs() {
  return await storage.get('ais-site-configs', {});
}

export async function saveSiteConfig(domain, config) {
  const all = await getSiteConfigs();
  all[domain] = config;
  await storage.set('ais-site-configs', all);
}

export async function deleteSiteConfig(domain) {
  const all = await getSiteConfigs();
  delete all[domain];
  await storage.set('ais-site-configs', all);
}

export async function getActiveConfig() {
  const host = location.hostname;
  const saved = (await getSiteConfigs())[host];
  if (saved) return { ...saved, source: 'saved' };
  for (const [domain, config] of Object.entries(SITE_CONFIGS)) {
    if (host === domain || host.endsWith('.' + domain)) return { ...config, source: 'default' };
  }
  if (isDiscourse()) return { post: '', comments: '', discourse: true, source: 'discourse' };
  return { post: detectMainContent(), comments: detectComments(), source: 'auto' };
}

export async function extractContent() {
  const config = await getActiveConfig();
  if (config.discourse) {
    const r = await extractDiscourse();
    if (r) return r;
  }
  const post = config.post ? (queryEls(config.post)[0] || '') : '';
  const comments = config.comments ? queryEls(config.comments).join('\n---\n') : '';
  const result = joinSections(post, comments);
  if (result) return result;
  return [...document.querySelectorAll('p')]
    .map(p => p.innerText.trim()).filter(t => t.length > 40).join('\n\n');
}

export async function getAutoSummarize(host) {
  return !!(await storage.get('ais-auto-summarize-sites', {}))[host];
}

export async function setAutoSummarize(host, val) {
  const all = await storage.get('ais-auto-summarize-sites', {});
  if (val) all[host] = true; else delete all[host];
  await storage.set('ais-auto-summarize-sites', all);
}

export async function getHiddenDomains() {
  return await storage.get('ais-hidden-domains', {});
}

export async function setHiddenDomains(d) {
  await storage.set('ais-hidden-domains', d);
}

let highlightedEls = [];

export function clearHighlights() {
  for (const { el, prev } of highlightedEls) {
    el.style.backgroundColor = prev || '';
    el.style.transition = '';
  }
  highlightedEls = [];
}

export async function highlightExtracted() {
  clearHighlights();
  const config = await getActiveConfig();
  const sels = [config.post, config.comments].filter(Boolean);
  const els = [];
  for (const s of sels) {
    try { document.querySelectorAll(s).forEach(el => els.push(el)); } catch (e) { /* skip */ }
  }
  for (const el of els) {
    highlightedEls.push({ el, prev: el.style.backgroundColor });
    el.style.transition = 'background-color 0.3s';
    el.style.backgroundColor = 'rgba(255, 255, 0, 0.2)';
  }
}

export function hasHighlights() {
  return highlightedEls.length > 0;
}
