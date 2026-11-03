# Architecture

How BioBand is put together, and why. This is the document to read before
changing anything in `src/audio/` or `src/instruments/`.

---

## The shape of the app

```
App.tsx                  boot: i18n, audio mode, orientation, auth, preload
  └── RootNavigator      bottom tabs → native stacks
        ├── Instruments  the five instruments + Drum Machine
        ├── Recordings   takes + Studio projects
        └── Profile      streaks, badges, settings
```

Three layers, and the dependency arrows only ever point downwards:

| Layer | Lives in | Knows about |
| --- | --- | --- |
| **Screens & components** | `src/screens`, `src/components` | hooks |
| **Hooks** | `src/hooks` | engines, storage |
| **Engines & audio** | `src/instruments`, `src/audio` | nothing above them |

An engine never imports a component. That is what makes it possible to render a
performance offline for export, with no UI mounted at all.

---

## Audio

### One context, one sample bank

There is exactly one `AudioContext` for the whole app
([`src/audio/sampleBank.ts`](../src/audio/sampleBank.ts)). Everything routes
through a shared master gain into a `tanh` soft-clipper, so when overlapping
notes sum past the ceiling the peaks round off instead of hard-clipping into
digital crackle.

Decoded buffers are cached by asset module id and never evicted. Decoding is the
expensive part; keeping them costs memory but makes re-entering an instrument
free.

### Notes ride the audio clock

The single most important decision in the codebase.

A `setTimeout` fires when JavaScript gets around to it. Under a busy render pass
it can be tens of milliseconds late, and the error is unbounded and
unpredictable — a melody scheduled that way sounds fine when the app is idle and
falls apart the moment something else happens on screen.

So [`src/audio/songScheduler.ts`](../src/audio/songScheduler.ts) runs the
standard Web Audio *lookahead* pattern:

```
every 25 ms:
    horizon = context.currentTime + 120 ms
    for every event that starts before the horizon:
        hand it to the engine with an ABSOLUTE start time
```

The JS timer only decides *when to queue*, never *when to sound*. Sounding is
the audio hardware's job, and it is sample-accurate. The timer can be 20 ms late
and nothing is audible, because the note was already queued for a moment that
has not arrived yet.

The same tick coalesces UI updates into a single `onAdvance` callback per frame,
so a dense passage does not fire one React render per note.

Two rules keep it honest after a stall. An event more than 50 ms late is
dropped rather than played — after a background pause, "catching up" meant every
missed note sounding at once ([`schedulerTiming.ts`](../src/audio/schedulerTiming.ts)).
And a loop's next pass is anchored to the exact end of the last one on the audio
clock, not restarted from a timer, so it does not drift. Loops, violin phrases,
the pad looper and the drum machine's step clock all ride this clock now.

### Instruments are nearest-anchor samplers

Each instrument ships a handful of real recordings and repitches with
`playbackRate` to reach the notes between them. The anchor tables live in
`src/instruments/*/…Samples.ts`.

The constraint that matters: **never stretch a sample more than about two
semitones**. Beyond that the formants shift audibly and a sampled piano starts
to sound like a synthesiser. Anchors are spaced to guarantee it — the piano's
eight samples sit three semitones apart, so the worst case is 1.5.

Violin samples additionally carry an `offsetSeconds`: some arco recordings open
with a thin crescendo, so playback enters at the point where the tone has
developed and the attack ramp hides the cut.

### Envelopes, not fixed strokes

A note is `attack → hold → release`. `hold` comes from the chart's written note
length, so a whole note and a sixteenth actually differ. This sounds obvious and
was not always true here: a fixed stroke length flattens a melody into a row of
identical blips.

For sustaining instruments the release deliberately runs *past* the next note. A
bow does not stop between slurred notes. Notes that genuinely need separating —
a repeat of the same pitch — are shortened in the chart itself
([`src/instruments/shared/songPerformance.ts`](../src/instruments/shared/songPerformance.ts)).

### Export renders offline

An instrument take is stored as note events, not audio. Exporting it means:

1. **Resolve** events to concrete sample/oscillator plays (`src/audio/dryBounce/`)
2. **Render** through an `OfflineAudioContext`
   ([`offlineBounce.ts`](../src/audio/offlineBounce.ts)) — far faster than real
   time
3. **Encode** to MP3 ([`pcmEncode.ts`](../src/audio/pcmEncode.ts))

The render is *dry*: reverb and echo are scheduled with wall-clock timers in the
live engines and cannot be fast-forwarded, so they are left out rather than
smeared.

It runs at the **live context's sample rate**
([`renderSampleRate.ts`](../src/audio/renderSampleRate.ts)). Buffers are decoded
at that rate and the library's buffer source does not resample by
`buffer.sampleRate`, so a fixed 44.1 kHz render of 48 kHz buffers came out about
a semitone and a half flat and 9% slow. The mix then goes through the same
master stage as live playback — 0.55 headroom and the `tanh` soft-clip in
[`masterChain.ts`](../src/audio/masterChain.ts) — so an export is as loud as what
was heard and saturates instead of clipping. In Studio exports, mic tracks are
time-stretched to the project tempo with a pitch-correcting source
([`timeStretch.ts`](../src/audio/timeStretch.ts)) and fall back to native speed
if that fails.

The buffer is sized to the longest-ringing note's actual decay, not a fixed
tail — a long-sustain guitar preset holds 3+ seconds and would otherwise be
truncated mid-decay.

The encoder is **sliced**: it yields to the event loop every 24 blocks (~0.6 s of
audio). lamejs is plain JavaScript on the same thread that draws the UI, so a
one-shot encode of a long take freezes the app with no spinner and no way out.
Slicing costs nothing measurable and keeps progress and cancellation real. It
also collapses to mono when both channels are bit-identical, which they usually
are — about a third less encode time for an identical-sounding file.

---

## Songs

### Charts are timed events, not a grid

A song is a list of `{ atMs, noteId, durationMs?, velocity?, role? }`. Absolute
milliseconds rather than beats, so a chart can hold rubato, an aksak meter, or a
tempo that drifts, without the format having to model any of it.

`role: 'accompaniment'` marks notes that support the melody; play-along scoring
only ever grades `melody`.

### The 24-key constraint

The piano exposes **C4–B5, 24 keys**. Most real songs do not fit.

The wrong fix is to fold out-of-range notes back by octaves. Every pitch stays
"correct" and the melody is destroyed — a rising phrase suddenly jumps down a
seventh in the middle.

The right fix, and what [`midiToSong.ts`](../src/instruments/piano/songs/midiToSong.ts)
does, is to choose **one transposition for the whole piece** that fits the most
notes, and shift everything by it. The key changes; the shape survives. Contour
is what a listener recognises.

Some hand-written charts are transposed for the same reason — Türk Marşı sounds
in E minor here so that the theme's peak and its real coda both fit the board.

### MIDI import

Every importer reads through one parser,
[`shared/midiReader.ts`](../src/instruments/shared/midiReader.ts): notes tagged
by channel, note-offs paired per channel, a tempo map searched in O(log n), and
caps on notes per part and per file *before* anything is converted. A zero time
division is refused; SMPTE files are timed in frames.
[`shared/midiArrange.ts`](../src/instruments/shared/midiArrange.ts) picks the
part: melodic instruments never take General MIDI channel 10, drums and pads
take only channel 10 when a file has one.

The piano converter, [`midiToSong.ts`](../src/instruments/piano/songs/midiToSong.ts),
then does rather more than place note-ons:

- **Tempo map** — the opening tempo sets the beat length; a meter is only
  derived when the tempo never changes after tick 0, since a grid means nothing
  under a moving tempo
- **Note-off tracking** so `durationMs` is the real written length
- **Chord splitting** — notes more than a seventh below the rest of a
  simultaneous group become the accompaniment part
- **De-jitter** — a human performance is snapped to the grid within a ±32 ms
  tolerance, and left alone beyond it, so groove survives but sloppiness does not

### Play-along

The five tutorial hooks are thin adapters over one session,
[`playAlong/usePlayAlongSession.ts`](../src/playAlong/usePlayAlongSession.ts);
judging lives in pure functions in
[`shared/playAlongScoring.ts`](../src/instruments/shared/playAlongScoring.ts).
A press is matched to the earliest note of that pitch whose window is open, so
one missed note in a fast run costs one miss rather than every note after it;
notes within 1 ms form a chord that can be played in any order. Practice time
is wall-clock time on the audio clock. A test plays every shipped chart through
the judging.

User charts arrive through [`playAlong/chartImport.ts`](../src/playAlong/chartImport.ts):
2 MB cap, schema validation shared by all instruments, octaves bounded so a
hostile pitch cannot hang the fold onto the keyboard.

---

## State and persistence

- **Local first.** Everything lives in `AsyncStorage` under `src/storage/`.
  The app is fully usable with no account and no network. List-shaped values go
  through [`jsonStorage.ts`](../src/storage/jsonStorage.ts): a missing key is the
  default, a failed read throws instead of being taken as empty (and then
  written back over real data), corrupt JSON is kept under a backup key, and
  each key has its own write lock.
- **Optional sync.** Signing in mirrors profile progress and settings into
  Supabase (`src/supabase/`). Access is enforced by Postgres **Row Level
  Security** — the anon key is public by design and grants nothing on its own.
  Recordings are **not** synced; they stay on the device. Sync pulls before it
  pushes and never pushes after a failed pull; progress from two devices is
  merged ([`mergeProfileProgress`](../src/storage/profileProgressStorage.ts)), not
  overwritten.
- **Launch never wipes on doubt.** Guests start fresh each launch, but
  [`launchAuthState.ts`](../src/auth/launchAuthState.ts) wipes only when every
  source agrees there is no account — an expired session that could not refresh
  offline keeps the library.
- **Signals over context.** Cross-screen events (a Studio overdub landing, an
  auth reset) go through tiny subscribe/notify modules in `src/studio/` and
  `src/storage/` instead of a global store. Fewer re-renders, and an engine can
  listen without a React tree.

---

## Launch

The first screen after boot is the instrument list, so tapping an instrument has
to make sound *immediately*. Waiting until a screen focuses to decode its
samples produced exactly the bug you would expect: a stall, then silent keys.

[`preloadInstruments.ts`](../src/audio/preloadInstruments.ts) therefore warms
every engine behind the launch screen, in the order a first-time user is likely
to reach them. Engines are warmed one at a time on purpose — each already
decodes its own files in parallel, and running all five at once spikes memory on
a low-end phone for no gain.

**This is also the app's biggest open cost:** roughly 437 seconds of audio across
116 files, about 79 MB decoded in memory, before the UI appears. Several sample
tails are far longer than any envelope reaches — the violin holds at most ~3 s
but ships 12–17 s files — so trimming them would cut both launch time and
memory. See *Known trade-offs* in the [README](../README.md).

---

## Conventions

- **TypeScript strict.** No `any` in app code.
- **Static `require()` for assets.** Metro cannot resolve a computed path; a
  dynamic require silently ships nothing.
- **Comments explain *why*.** The what is in the code. If a constant looks
  arbitrary, the comment says what breaks at other values.
- **No dead exports.** If nothing imports it, delete it — git remembers.
- **Tests for the pure parts.** Scoring, MIDI reading, import validation, sync
  merging and launch decisions are plain functions with Jest tests
  (`npm test`); hooks and engines stay thin around them.
