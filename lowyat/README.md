# lowyat

Violentmonkey userscript that makes Lowyat forum topic pages dense and dark, in the style of Reddit's RES night mode.

## Features

- One-line post header: author, time ago, like count, reply links, post number
- Avatar column, signatures and ads between posts hidden
- Quotes collapse to a one-line chip, `▶` chips expand on click, `↪` chips already show the whole quote
- Chip author links scroll to the quoted post and flash it, a `↩ Back to #N` button returns to where you were
- Quoted posts that aren't loaded open in a new tab
- `↩` links in the header list later replies on all loaded pages
- Topic starter posts get a blue left bar
- `▲ Load page` and `▼ Load page` buttons add the previous or next page in place, so Ctrl+F covers every loaded page
- Turns on the site's own dark theme, without the doodle background
- Zooms the whole forum to 115%, `PAGE_ZOOM` at the top of the script sets the level
- Topic lists hide locked topics, `Show N locked` in the list title bar brings them back
- Like, Quote and Reply buttons stay dim until hover

## Install

Open `lowyat.user.js` in a browser with Violentmonkey, then confirm install.

## Usage

- Hover the author name for rank, post count and join date.
- Hover the like count for the names of the people who liked the post.

## Privacy

The script sends no requests, it only changes the page.

## License

[MIT](LICENSE)
