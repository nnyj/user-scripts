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

## Install

Two versions: standalone (served by rclone) or userscript (browser extension).

### Standalone (native rcd)

Served directly by rclone alongside the stock web GUI. No browser extension needed.

1. Copy `index.html` to the rclone host, e.g. `/opt/rclone-dashboard/rcx.html`
2. Symlink into rclone's web GUI cache after rcd starts:
   ```bash
   GUI=$(find ~/.cache/rclone/webgui -name "build" -type d | head -1)
   ln -sf /opt/rclone-dashboard/rcx.html "$GUI/rcx.html"
   ```
3. Access at `https://<host>:5572/rcx.html`, stock GUI stays at `/`

For automated deploy see `103_rclone_setup.sh` (ExecStartPost handles the symlink).

### Userscript (browser extension)

1. Install [Violentmonkey](https://violentmonkey.github.io/) or Tampermonkey
2. Click [`rclone-dashboard.user.js`](rclone-dashboard.user.js)
3. Matches any rclone rcd on port 5572 (`*://*:5572/*`)
