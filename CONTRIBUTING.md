# Contributing to BioBand

Thanks for taking the time. This file covers how to get the project running,
what CI expects, and what makes a change quick to review.

By taking part you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Getting set up

```bash
git clone https://github.com/bilalgurkansanli/BioBand.git
cd BioBand
npm install
npm run android      # or: npm run ios
```

BioBand uses native audio modules, so it **does not run in Expo Go** — you need
a dev client build, which is what `npm run android` / `npm run ios` produce.

No `.env` is needed. Without one the app runs in guest mode with every
instrument, song, recording and Studio feature working; only sign-in and cloud
sync are off. See the [README](README.md#optional-cloud-sync) if you want those.

## Before you open a PR

```bash
npm run check        # typecheck + lint — exactly what CI runs
```

Both must be clean. CI runs them with **zero tolerance for warnings**, so a new
lint warning fails the build.

If you touched audio, please also say in the PR *how you checked it*. "Sounds
fine" is hard to review; "I rendered the chart to PCM and the downbeats land
within 3 ms" is not.

## What makes a change easy to review

**Keep the diff about one thing.** A bug fix and a refactor in the same PR take
three times as long to review as two PRs.

**Match the surrounding code.** Naming, comment density and structure vary a
little by area; follow the file you are in rather than a global ideal.

**Comments say *why*, not *what*.** The code already says what it does. If a
constant looks arbitrary, write down what breaks at other values — that is the
thing a future reader cannot recover.

**Delete rather than deprecate.** If nothing imports it, remove it. Git
remembers, and a `@deprecated` export that nobody calls is just a trap for the
next person.

**No dynamic `require()` for assets.** Metro cannot resolve a computed path, so
a dynamic require ships nothing and fails silently at runtime. Always a literal
path.

## Working on audio

A few things worth knowing before changing `src/audio/` or
`src/instruments/` — [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) has the
long version.

- **Never schedule notes with `setTimeout`.** Timing goes through
  [`songScheduler.ts`](src/audio/songScheduler.ts), which queues notes ahead of
  time against the audio clock. A JS timer that fires 20 ms late is inaudible
  with that pattern and very audible without it.
- **Do not stretch a sample more than ~2 semitones.** If a new note needs more,
  add an anchor recording instead of widening the repitch range.
- **Anything that runs on the JS thread for more than a frame must yield.**
  The MP3 encoder is the worked example: sliced, awaited, cancellable.
- **Charts are absolute milliseconds**, not beats. Do not add a global BPM to
  the format — the point is that a chart can hold rubato and aksak meters
  without the format modelling them.

## Adding a song

1. Add a chart under `src/instruments/<instrument>/songs/`.
2. Register it in that instrument's `catalog.ts`.
3. Add a `tutorial.songs.<id>.description` entry to **all three** locale files
   in `src/i18n/locales/`.
4. Play it end to end on a device. Charts that look right and sound wrong are
   the normal failure mode here.

Only add songs you have the right to distribute. Public-domain sources such as
the [Mutopia Project](https://www.mutopiaproject.org/) are ideal; a transcription
of a copyrighted recording is not.

## Adding a sample

See [`assets/samples/README.md`](assets/samples/README.md). The short version:
mono 44.1 kHz, static `require()`, and **record the source and licence** in the
folder's README. A sample with no provenance cannot be shipped.

## Translations

Three catalogues live in `src/i18n/locales/` — `en`, `tr`, `de`. A key must
exist in all three; a missing one renders as the raw key on screen.

Adding a language: copy `en.json`, translate, and register it in
[`src/i18n/index.ts`](src/i18n/index.ts).

## Reporting bugs

Use the issue templates. For anything audio-related, please include the device,
OS version, instrument and voice — timing and playback problems are often
specific to one audio backend.

## Security

Do not open a public issue for a security problem. Follow
[SECURITY.md](SECURITY.md).
