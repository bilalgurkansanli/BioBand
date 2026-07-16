---
name: goal
description: >-
  Runs a goal-driven implementation loop until acceptance criteria are green.
  Use when the user says /goal, "bitene kadar", "until done", instrument parity,
  or asks to keep going until a BioBand instrument matches piano-style quality.
---

# Goal loop (BioBand)

## When to use

User invokes `/goal`, asks to continue until done, or sets an instrument-parity target (e.g. drums like piano).

## How to run

1. Read the active plan / user goal. List **acceptance criteria** and **non-goals**.
2. Implement in small phases. After each phase, mark criteria done or blocked.
3. Do **not** stop for optional polish while required criteria remain open — unless the user says stop.
4. Expo Go compatibility and i18n (`tr` + `en`) are mandatory for UI work.
5. Do not edit the plan file unless the user asks.
6. Commit only when the user explicitly asks.

## Current goal: Violin = Guitar style (Band Mode excluded)

### Acceptance criteria

- [x] Landscape fingerboard: 4×(0–9) plays fretted pitches
- [x] PhraseBar phrases still work
- [x] Toolbar: back, metro, record, FX, volume, voice, game, settings
- [x] Metronome + BPM modal (shared)
- [x] Master volume modal
- [x] Event + mic recording; replay understands `vN:position` + `phrase:`
- [x] Hits through shared FX bus; FX modal audible
- [x] 6 voices (filter/rate/gain) + voice modal + theme accent
- [x] Settings (2 toggles) + persist
- [x] Öğretici: song → scope → level → countdown → demo/play → results
- [x] Levels guided / medium / free; score `hits/(hits+misses+wrong)`
- [x] Guide highlight on position/phrase during demo/play
- [x] i18n `violin.*` / `violin.game.*` in tr + en

### Non-goals

- Band Mode / backing / calibrate
- Arco / bow continuous tone
- Strum / arpeggio / rasgueado play-mode bar
- New sample banks, alternate tunings, MIDI import
- Multi-track overdub

### Phase order

0. Goal skill updated
1. Sound ID helpers + engine FX bus + voices
2. Toolbar + metronome + volume + voice modal
3. FX + settings + fingerboard guide/theme
4. Play-along catalog + hook + UI
5. i18n tr + en for all new keys

When all acceptance boxes are green, summarize for the user and stop.
