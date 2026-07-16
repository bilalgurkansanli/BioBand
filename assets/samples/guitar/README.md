# Guitar samples

Single-note MP3s for the fretted guitar engine (nearest-anchor sampler).

## Acoustic (`assets/samples/guitar/*.mp3`)

Source: [nbrosowsky/tonejs-instruments](https://github.com/nbrosowsky/tonejs-instruments) `samples/guitar-acoustic/`  
Public-domain / CC-by sample pack (see upstream `sample-source-info.txt`).

| Anchors | MIDI |
|---------|------|
| E2–D5 (17 notes) | 40–74 |

Used by Acoustic / Steel / Muted / Bright / Warm voices.

## Electric (`assets/samples/guitar/electric/*.mp3`)

Source: same pack, `samples/guitar-electric/`.

| Anchors | MIDI |
|---------|------|
| E2, Fs2, A2, C3, Ds3, Fs3, A3, C4, Ds4, Fs4, A4, C5, Ds5, Fs5 (14 notes) | 40–78 |

Used only when the **Electric** voice is selected.

## Note

Older `s1_E4.mp3`…`s6_E2.mp3` placeholders (~1.8 s synthetic) were replaced — they did not sound like a real guitar. Electric previously reused acoustic samples with EQ only; that also did not sound electric.
