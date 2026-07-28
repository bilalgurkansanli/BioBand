# Screenshots

[`raw/`](raw/) holds unedited captures straight off a phone, in the three
languages the app ships in. Everything else in this folder is generated from
them by the scripts below and is not committed.

| | |
| --- | --- |
| `raw/*.jpeg` | The captures. English has no suffix; `-tr` and `-de` are the same screens with the app in that language. |
| `store/`, `store-tr/`, `store-de/` | App Store sets — 1242×2688, ten images, landscape screens spread across two slots. |
| `play-en/`, `play-tr/`, `play-de/` | Play sets — 1080×1920 (9:16), eight images. Play rejects the App Store's taller ratio. |
| `graphics/` | Play's 512 px icon and the 1024×500 feature graphic, per language. |

## Rebuilding

```bash
python scripts/store_screenshots.py --input docs/screenshots/raw \
    --output docs/screenshots/store --panorama \
    --captions "Five instruments. One pocket.|Real piano sound//24 keys, two octaves|…"

python scripts/store_screenshots.py --input <selection> \
    --output docs/screenshots/play-en --panorama --store play --captions "…"

python scripts/make_store_graphics.py docs/screenshots/graphics
```

Captions are `|` separated, one per input file, in filename order. A caption
containing `//` is split across a panorama's two halves, so neither slot is left
holding half a sentence — the stores show these one at a time as well as
side by side.

The input folder decides the order and which screens make the cut: Play takes
eight images and a panorama costs two, so not everything fits.

## Capturing more

- **Android:** power + volume-down
- **iOS:** side + volume-up

Send them to yourself in a way that does not recompress — an e-mail attachment,
USB, or as a file rather than a photo. Do not crop or resize first: the scripts
locate the status bar and the system navigation bar by measuring them, and both
need the original pixels.

Whatever is in the status bar does not matter, it is painted out. A notification
banner *does* — it sits over the app's own content, and removing the banner
would take that with it.

Put real content on screen. A named recording, an actual streak, a loaded
pattern: empty states read as an unfinished app.

## Demo video

Not stored here — see the *Demo* section of the [README](../../README.md), whose
source contains an HTML comment with the two ways to add one (a GitHub-hosted
MP4, or `docs/demo.gif`).
