# Screenshots

The files here are placeholders so the README renders correctly out of the box.
**Replace them with real captures, keeping the exact filenames** — then nothing
in the README needs editing.

| File | Screen | Orientation | What should be visible |
| --- | --- | --- | --- |
| `01-instruments.png` | Instruments list | portrait | All five instruments plus the Drum Machine card |
| `02-recordings.png` | Recordings | portrait | A few takes, with the İndir / Paylaş row on a card |
| `03-profile.png` | Profile | portrait | Streak, total practice time, a couple of earned badges |
| `04-piano.png` | Piano | **landscape** | The 24-key board mid-play, with the toolbar |
| `05-tutorial.png` | Tutorial Mode | **landscape** | A song playing, with the guide highlighting the next note |
| `06-drum-machine.png` | Drum Machine | **landscape** | The step grid with a pattern loaded |
| `07-studio.png` | Studio project | **landscape** | The timeline with two or three tracks |
| `08-launch.png` | Launch screen | portrait | Logo, greeting, progress bar and a quote |

`08-launch.png` is not referenced by the README yet — it is there if you want it.

## Capturing

- **Android:** power + volume-down, or `adb exec-out screencap -p > shot.png`
- **iOS:** side + volume-up, or **Device ▸ Screenshot** in the Simulator

Tips that make the set look deliberate rather than incidental:

- Use one device for every shot so the frames match.
- Put real content on screen — a named recording, an actual streak, a loaded
  pattern. Empty states read as an unfinished app.
- Use the same language across all shots.
- Keep the status bar tidy: full battery, no notifications, sensible clock.

## Format

PNG. Any resolution works — the README sizes them with `width` attributes, so a
2340 px capture and a 1080 px one lay out identically. The placeholders are
1080×2280 (portrait) and 2280×1080 (landscape); matching those aspect ratios
keeps the table from shifting.

Please keep each file under about 500 KB so cloning the repo stays quick;
`pngquant` or `oxipng` will get you there without a visible difference.

## Demo video

Not stored here — see the *Demo* section of the [README](../../README.md), whose
source contains an HTML comment with the two ways to add one (a GitHub-hosted
MP4, or `docs/demo.gif`).
