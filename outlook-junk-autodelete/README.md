# Outlook Junk Auto-Delete

Automatically deletes junk emails from known spam senders in [Outlook Web](https://outlook.live.com/mail/).

## How it works

- Polls the Junk Email folder via OWA's internal `service.svc` API
- Matches sender names against a configurable blocklist
- Soft-deletes matched messages (moves to Deleted Items)
- Polls every 60s when focused, every 5 minutes when backgrounded
- Authenticates using the MSAL token already in `localStorage` and the `X-OWA-CANARY` CSRF cookie, no credentials to configure

## Setup

1. Install the script in Violentmonkey/Tampermonkey
2. Log into Outlook Web at `outlook.live.com`
3. Edit the `SENDERS` array in the script to match your spam

## Configuration

| Constant | Default | Description |
|---|---|---|
| `INTERVAL_FG` | 60s | Poll interval when tab is focused |
| `INTERVAL_BG` | 300s | Poll interval when tab is backgrounded |
| `MAX_ITEMS` | 50 | Max junk items to fetch per poll |
| `SENDERS` | (list) | Sender names to match (case-insensitive substring) |
