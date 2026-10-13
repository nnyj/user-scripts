# youtube-multiselect

Violentmonkey userscript that picks several videos on a YouTube playlist page, then copies, moves or removes them in one go.

## Features

- Click rows to pick, Shift-click picks a range
- Copy or move picked videos to another playlist
- Remove picked videos from your own playlist
- Esc leaves select mode

## Install

Open `youtube_multiselect.user.js` in a browser with Violentmonkey, then confirm install.

## Usage

- Open a playlist page, click `Select` at the bottom right.
- `All` picks only rows YouTube has loaded, scroll down first for long playlists.
- The target list shows your playlists, `enter URL…` asks for any playlist URL or ID.

## Privacy

Requests go only to youtube.com, using your signed-in session.

## License

[MIT](LICENSE)
