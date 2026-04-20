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
  'ais-max-tokens':           16000,
  'ais-max-chars':            200000,
  'ais-custom-url':           '',
  'ais-api-key':              '',
  'ais-opacity':              80,
  'ais-panel-width':          null,
  'ais-site-configs':         {},
  'ais-auto-summarize-sites': {},
  'ais-hidden-domains':       {},
  'ais-system-prompt': [
    'You are a subagent. Summarize this content for Opus to use in a coding task.',
    'Extract key insights. Use emoji, bullet, tables for readability.',
    'Categories use emoji too.',
    '',
    'Visual features (use when they aid comprehension):',
    '- TL;DR: Start with `> **TL;DR:** one-sentence takeaway` blockquote at top.',
    '- Sentiment bars: `[bar:N/M label]` where N=value, M=max. e.g. `[bar:8/10 Codex instruction following]`',
    '- Mermaid diagrams: use ```mermaid fences. Good diagram types:',
    '  - `mindmap` for topic clustering / concept maps',
    '  - `flowchart` for decisions, processes, relationships',
    '  - `sequenceDiagram` for interactions between systems/people',
    '  - `pie` for sentiment/opinion distribution',
    '  - `timeline` for chronological content',
    '  Always include 1-2 diagram types that best fit content.',
    '',
    'Tally repeats/sentiments: \u{1F525} after points (\u{1F525}=3-4, \u{1F525}\u{1F525}=5-7, \u{1F525}\u{1F525}\u{1F525}=8+).',
    'Style:',
    '- Drop articles, filler, pleasantries, hedging',
    '- Fragments fine. Short synonyms. Technical terms stay exact.',
    '- Pattern: [thing] [action] [reason].',
    '- ## headings + --- separators for grouped content.',
    '- Use collapsible sections: `<details><summary>Section title</summary>content</details>` for secondary detail.',
  ].join('\n'),
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

