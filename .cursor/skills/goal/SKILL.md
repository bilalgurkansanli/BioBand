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

## Current goal: Guitar = piano style (Band Mode excluded)

### Acceptance criteria

- [x] Landscape fretboard: 6×(0–12) plays fretted pitches
- [x] ChordBar strums still work
- [x] Toolbar: back, metro, record, FX, volume, voice, game, settings
- [x] Metronome + BPM modal (shared)
- [x] Master volume modal
- [x] Event + mic recording; replay understands `sN:fF` + `chord:` + legacy `sN`
- [x] Hits through shared FX bus; FX modal audible
- [x] 6 voices (filter/rate/gain) + voice modal + theme accent
- [x] Settings (2 toggles) + persist
- [x] Öğretici: song → scope → level → countdown → demo/play → results
- [x] Levels guided / medium / free; score `hits/(hits+misses+wrong)`
- [x] Guide highlight on fret/chord during demo/play
- [x] i18n `guitar.*` / `guitar.game.*` in tr + en

### Non-goals

- Band Mode / backing / calibrate / pickMode
- Sustain, tone ±12, scale lights, speed HUD
- New sample banks, capo, alternate tunings, MIDI import
- Multi-track overdub

### Phase order

0. Goal skill updated
1. Fretboard + fretted engine + recording IDs
2. Toolbar + metronome + volume + voices
3. FX + settings
4. Play-along catalog + hook + UI

When all acceptance boxes are green, summarize for the user and stop.
