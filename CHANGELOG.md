# Changelog

All notable changes to this project are documented here. Versions follow the app's release history rather than strict [SemVer](https://semver.org/), since this is a mobile app rather than a published library.

## v2.1 — store version 1.1.0 (2026-11-03)

**Platform.** Expo SDK 57 (React Native 0.86, React 19.2, TypeScript 6). iOS now
needs 16.4 or later. Android system bars follow the edge-to-edge rules, and
expo-audio no longer declares background playback the app never uses.

**Your data is safer.**
- Opening the app offline while signed in no longer erases the library. A
  session that ends without a sign-out keeps the data and asks you to sign in.
- Sync pulls before it pushes and never overwrites the cloud after a failed
  pull; progress from two devices is merged instead of last-write-wins.
- A failed or corrupt read no longer gets written back as an empty list.
- Restoring a backup treats the file as untrusted: safe file names, no external
  paths, a size cap.
- Sign-out and account deletion remove every audio folder and cancel the
  practice reminder; Apple tokens from the Android sign-in are revoked too.

**Tutorials play fairer.**
- One missed note in a fast passage costs one miss, not every note after it.
- Chords and stacked drum/pad hits can be played in any order.
- Letting a Band Mode track run out counts the unplayed notes.
- Practice time is real time, counted once — no more double credit during
  tutorials or recordings — and free play completes the daily practice goal.
- Piano excerpts pick the right section after calibration.
- MIDI import ignores the drum channel for melodic instruments and uses only it
  for drums and pads; malformed or huge files are refused instead of freezing
  the app.

**Sound.**
- Exports match live playback in pitch, tempo and loudness (they used to come
  out about a semitone and a half flat on 48 kHz phones).
- Studio plays every track with its own voice; mic tracks keep their pitch in
  tempo-changed exports; overdubs line up with the backing.
- Piano takes remember their voice and transposition.
- Loops, the drum machine, violin phrases and the pad looper run on the audio
  clock; organ, rhodes and synth no longer fade with repeated playing.

**Interface.** Smoother instrument surfaces and Studio playback, buttons kept
clear of the navigation bar and home indicator, dialogs above the keyboard, a
Back button on the rotate prompt for tablets, screen-reader support for every
instrument and slider, and wording fixes in Turkish and German.

**New song.** Great Fairy's Fountain (Koji Kondo) on the piano: harp-like
arpeggios over a slowly falling bass.

**Repository.** 820+ Jest tests (scoring, MIDI, import validation, sync,
launch), the five tutorial hooks folded into one session core, CI on Node 22.

## v2 — store version 1.0.0 (2026-08-15)

**Recordings — export rebuilt.** Download and Share are now two direct buttons
instead of a format-picker sheet. The MP3 encoder runs sliced and awaited rather
than in one blocking pass, so a long take no longer freezes the app; there is a
progress sheet with a working Cancel, and encoding identical stereo channels as
mono cuts about a third off the time. Microphone and imported takes are exported
by byte copy instead of being needlessly re-encoded. Download writes to a folder
you pick; Share opens the system sheet.

**Launch.** The native splash is now black with the app logo, replacing the
white screen and default Expo placeholder that flashed before the app's own
loading screen. A greeting appears under the logo in all three languages.

**Fixes.** The rotate-to-landscape prompt no longer sticks after returning from
the file picker. The chart picker offers only MIDI and JSON files. Two exports
can no longer run at once and share one cancel flag.

**Repository.** Open-source scaffolding: contributing guide, code of conduct,
security policy, issue and PR templates, CI (typecheck, lint, `expo-doctor`,
bundle), Dependabot, architecture notes, and per-instrument sample attribution.
ESLint added and the codebase brought to zero warnings.

**Cleanup.** Removed three superseded modules, 27 unreferenced functions, 60
unused translation keys across all locales, 16 orphaned sample files, and all
18 unused icon fonts — the last of which alone cut 3.85 MB from the bundle.

## v1.9

Cloud sync (Supabase + Google Sign-In), MP3/MP4 export/import, violin MIDI import, German locale.

## v1.8

Profile badges/avatars, violin user song import, practice reminders, and Studio/recording UI polish.

## v1.7

Unified Tutorial Mode across all instruments with a shared guided wizard.

## v1.6

Studio multi-track recording, Profile streaks, Drum Machine sequencer, and Pads parity with other instruments.

## v1.5

Dropped the Home tab, added store-review song requests, and richer guitar/violin samples with play-along.

## v1.4

Drums and guitar piano-style parity with fretted guitar, kits/voices, FX, and play-along tutorials.

## v1.3

Band Mode full-song backing, user song import, and piano modal polish.

## v1.2

Piano settings, FX/metronome/sustain, and recording playback.

## v1.1

Piano play-along, audio fixes, and EAS build support.

## v1.0

Initial multi-instrument app with a recording library.
