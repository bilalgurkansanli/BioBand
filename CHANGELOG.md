# Changelog

All notable changes to this project are documented here. Versions follow the app's release history rather than strict [SemVer](https://semver.org/), since this is a mobile app rather than a published library.

## Unreleased

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
