---
name: goal
description: >-
  Runs a goal-driven implementation loop until acceptance criteria are green.
  Use when the user says /goal, "bitene kadar", "until done", instrument parity,
  or asks to keep going until a BioBand instrument matches piano-style quality.
---

# Goal loop (BioBand)

## When to use

User invokes `/goal`, asks to continue until done, or sets an instrument-parity target.

## How to run

1. Read the active plan / user goal. List **acceptance criteria** and **non-goals**.
2. Implement in small phases. After each phase, mark criteria done or blocked.
3. Do **not** stop for optional polish while required criteria remain open — unless the user says stop.
4. Expo Go compatibility and i18n (`tr` + `en`) are mandatory for UI work.
5. Do not edit the plan file unless the user asks.
6. Commit only when the user explicitly asks.

## Current goal: Bateri Makinesi — icons, types, settings

### Acceptance criteria

- [x] Satır solunda kısa yazı yok; ikon + a11y label
- [x] Rastgele = zar + metin; Play yanında Başlat/Durdur
- [x] Davul: max 2 tom; çeşitlendirilmiş satırlar
- [x] Ayarlar: 5 makine türü (davul/piyano/gitar/keman/padler)
- [x] Tür = ses bankası + tema renkleri
- [x] 8+ satırda dikey scroll; önemliler üstte
- [x] Pattern `machineType` persist
- [x] i18n tr/en; Expo Go

### Non-goals

- Velocity / swing / mic / Studio / ayrı route per type

When all acceptance boxes are green, summarize for the user and stop.
