# Pad samples

One-shots for the launchpad banks in
[`src/instruments/pads/padsBanks.ts`](../../../src/instruments/pads/padsBanks.ts).

The drum-flavoured pads do not live here — they reuse
[`assets/samples/drums/`](../drums/) through `PAD_SHARED_FILES`, so a kick is the
same recording whether you hit it on the drum pad or on a launchpad slot.

## Synthesised in this repo — no third-party licence

Both generators are pure-stdlib Python, deterministic, and committed alongside
the samples, so every file here can be rebuilt from source:

| Files | Generator |
| --- | --- |
| `synth_808.wav`, `synth_riser.wav`, `synth_whoosh.wav`, `synth_noise.wav`, `synth_tick.wav`, `synth_sweep.wav`, `synth_subdrop.wav`, `synth_reverse.wav`, `synth_laser.wav`, `synth_stab.wav`, `synth_tapestop.wav`, `synth_boom.wav` | [`scripts/make_pads_fx_samples.py`](../../../scripts/make_pads_fx_samples.py) |
| `turk_darbuka_*.wav`, `turk_bendir_*.wav`, `turk_def_*.wav`, `turk_kasik*.wav`, `turk_zilli_masa*.wav` | [`scripts/make_turkish_perc_samples.py`](../../../scripts/make_turkish_perc_samples.py) |

```bash
python scripts/make_pads_fx_samples.py assets/samples/pads
python scripts/make_turkish_perc_samples.py assets/samples/pads
```

The Turkish percussion bank models membrane hits as sums of inharmonic drum
modes (1, 1.59, 2.14, 2.65, 3.16×) rather than sampling a real darbuka, so the
bank is original work under this repository's own licence.

## ⚠️ Provenance not recorded

`clap.wav` and `impact.wav` were added in v1.6 without a documented source, and
this file will not invent one. **Before publishing a build or relicensing this
repo, confirm where those two came from** and either record the licence here or
replace them — the two generators above show how to synthesise a substitute.

## Format

Mono 44.1 kHz WAV. Kept uncompressed on purpose: these are short percussive
one-shots where MP3's encoder delay would smear the transient that makes them
land in time.
