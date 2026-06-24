# Rclone Dashboard

Replaces the default rclone web GUI dashboard with a compact, information-dense layout.

## Features

- Grouped job stats with per-file progress bars
- Overall progress bar with speed, ETA, transfer/check counts
- Expandable error logs per job
- Cancel individual jobs or stop all
- Focus mode: hide everything except job stats
- Sidebar collapse persists across page loads
- Auto-updates every second via RC API polling

## Supported

Matches any rclone rcd instance on port 5572 (`*://*:5572/*`).

## Install

1. Install [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey
2. Click [`rclone-dashboard.user.js`](rclone-dashboard.user.js)
