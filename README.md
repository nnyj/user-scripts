# user-scripts

<div align="center">

[![Stars](https://img.shields.io/github/stars/nnyj/user-scripts?style=for-the-badge&labelColor=555&color=e3b341)](https://github.com/nnyj/user-scripts/stargazers)

</div>

Userscripts for [Violentmonkey](https://violentmonkey.github.io/) and Tampermonkey, plus a standalone rclone dashboard.

## Scripts

- [ai-summarizer](ai-summarizer/): sends any page to a local LLM (LM Studio, etc.) and streams back bullet-point summaries, mermaid diagrams, sentiment bars, and tables. Visual element picker for site-specific configs, auto-summarize per domain. Distributable as userscript or browser extension (Chrome/Firefox). Matches `*://*/*`
- [outlook-junk-autodelete](outlook-junk-autodelete/): polls the Junk folder via OWA's internal API and soft-deletes emails from a configurable sender blocklist. No setup beyond editing the sender list. Matches `outlook.live.com`
- [outlook-unread-count](outlook-unread-count/): prepends total unread count to the Outlook tab title, e.g. `(5) Mail`. Matches `outlook.live.com`, `outlook.office.com`, `outlook.office365.com`
- [rclone-dashboard](rclone-dashboard/): standalone HTML dashboard (`rcx.html`) that replaces the default rclone web GUI with grouped job stats, per-file progress bars, expandable error logs, and focus mode. `rcx-inject.js` adds a "Dashboard" link to the rclone sidebar

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey
2. Click any `.user.js` file in this repo — the extension will prompt to install
3. Or open the raw file URL directly in the browser

For rclone-dashboard, drop `rcx.html` and `rcx-inject.js` into the rclone web GUI static files directory.

## License

[MIT](LICENSE)
