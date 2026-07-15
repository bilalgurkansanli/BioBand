# Drum samples

Sampled drum hits for the BioBand drum pad (Expo Go–friendly MP3 one-shots).

## Sources (current)

| File | Source | Why |
|------|--------|-----|
| `crash.mp3` | [Stomachache Analog Cymbal](https://freesound.org/people/stomachache/sounds/140153/) (CC0) | Trimmed to **~1.1 s** with fade-out; heavy EQ cuts at 4.5 / 7 / 10 kHz + lowpass ~6.2 kHz (old 3.6 s full wash was tinny) |
| `kick.mp3` | Wes Bos [JavaScript30](https://github.com/wesbos/JavaScript30) Drum Kit (`boom.wav`) | Fuller 24-bit PCM (~1 s) vs short `kick.wav` |
| `snare.mp3` | [@teropa/drumkit](https://github.com/teropa/drumkit) `snare2` (Freesound DWSD pack, CC-BY) | Longer/fuller body than JavaScript30 `snare.wav` (0.25 s) |
| `hihat_closed.mp3` | JavaScript30 (`hihat.wav`) | 24-bit PCM; replaces tiny teropa `hatClosed2` |
| `hihat_open.mp3` | JavaScript30 (`openhat.wav`) | 24-bit PCM |
| `ride.mp3` | JavaScript30 (`ride.wav`) | 24-bit PCM, long decay |
| `tom_mid.mp3` | JavaScript30 (`tom.wav`) | 24-bit PCM mid tom |
| `tom_hi.mp3` | JavaScript30 (`tom.wav`) pitched +3 semitones | Separate HiTom WAV unavailable |
| `tom_low.mp3` | JavaScript30 (`tom.wav`) pitched −4 semitones | Separate LowTom WAV unavailable |

Teropa package also credits [DWSD Deep House Drum kit](https://freesound.org/people/DWSD/packs/11575/) (CC-BY) and [Karman Lyne 808 toms](https://freesound.org/people/Karman_Lyne/sounds/520168/) (CC0).

## Processing

Re-encoded with ffmpeg (`libmp3lame` VBR `-q:a 2`), mono 44.1 kHz:

- Soft highpass / lowpass as needed
- **Crash:** short musical hit (~1.1 s), strong upper-mid / air cuts, fade-out — not a 3–4 s tinny wash
- Mild compression on kick only
- Peak normalize / limiter (~−1 dB) — avoid aggressive `loudnorm I=-16`

## Note

Local folder `.tmp-drums\` previously held alternate WAVs (`Crash.wav`, `HhC.wav`, toms, etc.); those were missing at rebuild time, so Freesound HQ + JavaScript30 WAVs were used instead.
