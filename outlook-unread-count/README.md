# Outlook Unread Count

Adds a total unread count to the Outlook Web tab title, e.g. `(5) Mail`.

## How it works

- Polls the folder tree for unread count badges every 3 seconds
- Sums unread counts across all folders (excluding Deleted Items)
- Prepends `(N)` to the page title so the count shows in the tab

## Supported domains

- `outlook.office365.com`
- `outlook.live.com`
- `outlook.office.com`
