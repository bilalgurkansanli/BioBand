# Sample library

Every sound BioBand makes comes from this folder — nothing is fetched at
runtime. Each instrument keeps its own attribution file; this page is the index
a licence review should start from.

| Folder | Contents | Origin | Licence |
| --- | --- | --- | --- |
| [`piano/`](piano/) | 8 grand piano notes | Salamander Grand Piano (Alexander Holm) | **CC BY 3.0 — attribution required** |
| [`guitar/`](guitar/) | Acoustic + electric single notes | `nbrosowsky/tonejs-instruments` | Public domain / CC BY |
| [`violin/`](violin/) | Bowed (arco) single notes | `nbrosowsky/tonejs-instruments` | Public domain / CC BY |
| [`drums/`](drums/) | Kit one-shots + 808 kit | Freesound (CC0/CC BY), JavaScript30, `teropa/drumkit`, plus synthesised layers | Mixed — see the per-file table |
| [`pads/`](pads/) | FX and Turkish percussion | Synthesised by `scripts/*.py` in this repo | This repository's licence |

Two files — `pads/clap.wav` and `pads/impact.wav` — have no recorded source.
See [`pads/README.md`](pads/README.md) before shipping or relicensing.

## How samples are used

Instruments are **nearest-anchor samplers**: a handful of real recordings spread
a few semitones apart, repitched with `playbackRate` to reach the notes in
between. No note travels more than about two semitones from a real recording,
past which a sampled instrument starts to sound synthetic.

Samples are decoded once at launch and cached for the whole session
([`src/audio/sampleBank.ts`](../../src/audio/sampleBank.ts)), so leaving and
re-entering an instrument costs nothing.

## Adding or replacing a sample

1. Drop the file in the instrument's folder. Mono, 44.1 kHz. MP3 for pitched
   material, WAV for short percussive one-shots where encoder delay would smear
   the transient.
2. Register it in that instrument's `*Samples.ts` / `*Sounds.ts` with a static
   `require()` — Metro cannot resolve a computed path, so dynamic requires
   silently ship nothing.
3. Record where it came from and under what licence in the folder's `README.md`.
   A sample with no provenance cannot be shipped.
