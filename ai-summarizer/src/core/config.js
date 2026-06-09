import systemPrompt from './system_prompt.txt';

export const PROVIDERS = {
  llamacpp:    { label: 'llama.cpp',   url: 'http://localhost:8080/v1' },
  lmstudio:    { label: 'LMStudio',   url: 'http://localhost:1234/v1' },
  cliproxyapi: { label: 'CLIProxyAPI', url: 'http://localhost:8317/v1' },
  custom:      { label: 'Custom',      url: '' },
};

export const DEFAULTS = {
  'ais-provider':             'llamacpp',
  'ais-model':                '',
  'ais-model-suffix':         '',
  'ais-max-tokens':           32000,
  'ais-max-chars':            200000,
  'ais-custom-url':           '',
  'ais-api-key':              '',
  'ais-opacity':              80,
  'ais-panel-width':          null,
  'ais-site-configs':         {},
  'ais-auto-summarize-sites': {},
  'ais-hidden-domains':       {},
  'ais-system-prompt':        systemPrompt.trim(),
};

export const SITE_CONFIGS = {
  'old.reddit.com':       { post: '.thing.link .usertext-body .md', comments: '.comment .usertext-body .md' },
  'news.ycombinator.com': { post: '', comments: '.commtext' },
  'lobste.rs':            { post: '.story_text', comments: '.comment_text' },
  'lemmy':                { post: '.post-listing .md, .post-content', comments: '.comment .md' },
  'tildes.net':           { post: '.topic-text-original', comments: '.comment-text' },
  'stackexchange.com':    { post: '.question .s-prose', comments: '.answer .s-prose' },
  'stackoverflow.com':    { post: '.question .s-prose', comments: '.answer .s-prose' },
};

const NO_THINKING = /haiku|gpt-3|gpt-4o-mini/i;
export function modelSupportsThinking(name) {
  return name && !NO_THINKING.test(name);
}
