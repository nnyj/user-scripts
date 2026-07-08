# Rclone Dashboard

Compact rclone rcd dashboard with grouped job stats, progress bars, error logs.

## Features

- Grouped job stats with per-file progress bars
- Overall progress bar with speed, ETA, transfer/check counts
- Expandable error logs per job
- Cancel individual jobs or stop all
- Auto-updates every second via RC API polling
- Pauses polling during text selection

## Install

1. Copy `rcx.html` and `rcx-inject.js` to the rclone host
2. `rcx-inject.js` adds a sidebar link in the stock GUI pointing to `/rcx.html`
3. Access at `https://<host>:5572/rcx.html`, stock GUI stays at `/`

For automated deploy see `103_rclone_setup.sh` (ExecStartPost copies files into the web GUI build dir).
