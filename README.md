# user-scripts

A collection of userscripts for [Violentmonkey](https://violentmonkey.github.io/) / [Tampermonkey](https://www.tampermonkey.net/).

## Scripts

### AI Page Summarizer

> [`ai-summarizer.user.js`](ai-summarizer.user.js)

Adds a floating **Summarize** button to every page that sends the page content to a local LLM (via an OpenAI-compatible API like [LM Studio](https://lmstudio.ai/)) and streams back a summary in a resizable side panel.

**Features**

- Streams markdown responses with live rendering (including `<think>` block collapsing)
- Built-in site configs for Reddit, Hacker News, Lobsters, Lemmy, Tildes, Stack Overflow, and Discourse forums
- Visual element picker to define custom CSS selectors for any site
- Auto-detection heuristic for unconfigured sites (finds `<article>`, `<main>`, comment sections, etc.)
- Auto-summarize toggle per site — opens the panel on page load
- Configurable API URL, system prompt, max tokens, and max input characters
- Import/export settings as JSON
- Copy extracted content or the generated summary to clipboard
- Adjustable panel opacity and width (drag to resize)

**Setup**

1. Install the script in Violentmonkey/Tampermonkey
2. Run a local OpenAI-compatible server (default: `http://localhost:1234/v1/chat/completions`)
3. Click **Summarize** on any page

---

### Outlook Junk Auto-Delete

> [`outlook-junk-autodelete.user.js`](outlook-junk-autodelete.user.js)

Automatically deletes junk emails from known spam senders in [Outlook Web](https://outlook.live.com/mail/).

**How it works**

- Polls the Junk Email folder via OWA's internal `service.svc` API
- Matches sender names against a configurable blocklist
- Soft-deletes matched messages (moves to Deleted Items)
- Polls every 60s when the tab is focused, every 5 minutes when backgrounded
- Authenticates using the MSAL token already in `localStorage` and the `X-OWA-CANARY` CSRF cookie — no credentials to configure

**Setup**

1. Install the script in Violentmonkey/Tampermonkey
2. Log into Outlook Web at `outlook.live.com`
3. Edit the `SENDERS` array in the script to match your spam

## Installation

1. Install [Violentmonkey](https://violentmonkey.github.io/) (recommended) or Tampermonkey in your browser
2. Click on a `.user.js` file in this repo — the extension will prompt you to install it
3. Or open the raw file URL directly

## License

[MIT](LICENSE)
