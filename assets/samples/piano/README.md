# Piano samples

Eight acoustic grand piano single-note recordings for the nearest-anchor
sampler in [`src/instruments/piano/pianoSamples.ts`](../../../src/instruments/piano/pianoSamples.ts).

| File | Pitch | MIDI |
| --- | --- | --- |
| `C4.mp3` | C4 | 60 |
| `Ds4.mp3` | D♯4 | 63 |
| `Fs4.mp3` | F♯4 | 66 |
| `A4.mp3` | A4 | 69 |
| `C5.mp3` | C5 | 72 |
| `Ds5.mp3` | D♯5 | 75 |
| `Fs5.mp3` | F♯5 | 78 |
| `A5.mp3` | A5 | 81 |

Anchors sit three semitones apart, so no key is ever repitched more than about
1.5 semitones from a real recording.

## Source and licence

**Salamander Grand Piano V3** — a Yamaha C5 sampled by **Alexander Holm**,
distributed under [**CC BY 3.0**](https://creativecommons.org/licenses/by/3.0/).
These files come via the Tone.js demo asset set.

CC BY requires attribution wherever the app is distributed. BioBand credits it
here and in the source header of `pianoSamples.ts`. **Keep that credit if you
fork this project or ship a build.**

## Processing

Trimmed and re-encoded to mono-compatible MP3 at 128 kbps / 44.1 kHz. Every
sample-based piano voice (`bright`, `warm`, …) reuses these same eight files and
differs only in envelope and EQ — the synthesised voices (organ, rhodes, synth)
use oscillators instead and load no samples at all.
