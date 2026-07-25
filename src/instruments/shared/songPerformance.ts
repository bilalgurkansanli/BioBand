// Charts store onsets. What makes a chart sound like the *song* is everything
// between the onsets: how long each note is held, and how hard it is struck.
// Rather than demand that every transcription spell all of that out, these
// helpers derive a musical default from the material already there, and let a
// song override any note it wants.

export type SongRole = 'melody' | 'accompaniment';

/**
 * How a single note should be performed. Engines accept this for song
 * playback; interactive taps leave it off and keep their immediate,
 * fixed-envelope behaviour.
 */
export type NotePerformance = {
  /** Absolute audio-context time (seconds) the note must sound at. */
  atTime?: number;
  /** How long the note is held before it is released (seconds). */
  sustainSeconds?: number;
  /** 0..1 strike strength. */
  velocity?: number;
  /**
   * Semitones to sound the note away from its written pitch. The keyboard is
   * only two octaves wide, so an accompaniment written on it would collide
   * with the tune; sounding it an octave down puts it in a real bass register
   * without needing keys that do not exist.
   */
  transposeSemitones?: number;
};

/**
 * Loudness multiplier for a 0..1 velocity — same curve shape across engines.
 *
 * Centred so an unaccented note lands near 1.0: adding dynamics must shape the
 * line, not quietly turn the whole song down relative to the flat playback it
 * replaces. Accents are allowed slightly above 1 — the master bus keeps
 * headroom and soft-clips, so the peaks cost nothing.
 */
export function velocityGain(velocity: number | undefined): number {
  if (typeof velocity !== 'number' || !Number.isFinite(velocity)) {
    return 1;
  }
  const v = Math.min(1, Math.max(0.05, velocity));
  // Squared response: soft notes drop away convincingly without the loud end
  // of the range flattening out.
  return Math.min(1.25, Math.max(0.45, 0.49 + 0.7 * v * v));
}

/** Fields any instrument's song event may carry beyond its own note id. */
export type PerformedEvent = {
  atMs: number;
  /** Explicit sustain. Omitted → derived from the gap to the next note. */
  durationMs?: number;
  /** 0..1 strike strength. Omitted → derived from metrical position. */
  velocity?: number;
  /** Omitted → 'melody'. Accompaniment plays but is not scored or highlighted. */
  role?: SongRole;
};

/**
 * Sustain for the last note of a voice when the chart does not say. Matches
 * the engines' own default hold, so a song still rings out at the end instead
 * of being cut off by the very mechanism that gave it note lengths.
 */
const FINAL_NOTE_MS = 3000;
const MIN_SUSTAIN_MS = 90;
/**
 * Ceiling on derived sustain. Where a chart writes a genuine rest, holding all
 * the way to the next onset would blur it, so long gaps stop here instead.
 */
const MAX_SUSTAIN_MS = 2600;

/**
 * Nominal strike for an unaccented note. Sits high because engines that carry
 * their own velocity curve (drums, pads) feed this straight into it — a low
 * nominal would just make song playback quieter than a hand-played hit.
 */
const BASE_VELOCITY = 0.8;
const DOWNBEAT_BONUS = 0.16;
const STRONG_BEAT_BONUS = 0.07;
const OFFBEAT_PENALTY = 0.06;
const PHRASE_START_BONUS = 0.05;
/** Accompaniment sits under the melody rather than competing with it. */
const ACCOMPANIMENT_SCALE = 0.72;
const MIN_VELOCITY = 0.25;

export function roleOf(event: PerformedEvent): SongRole {
  return event.role ?? 'melody';
}

export type DurationOptions<T extends PerformedEvent = PerformedEvent> = {
  minMs?: number;
  maxMs?: number;
  finalMs?: number;
  /**
   * True when two events are the same note. A note repeated straight away has
   * to be re-struck, so it cannot be held right up to its own repeat.
   */
  isSameNote?: (a: T, b: T) => boolean;
};

/**
 * Silence left before a repeat of the same note. Without it the two run
 * together into one longer note — a quarter of the notes in a syllabic vocal
 * line are repeats, so the tune ends up with audibly fewer notes than it has.
 */
const REARTICULATION_MS = 55;
/** A restruck note may be shortened below the ordinary floor, but not to nothing. */
const MIN_REARTICULATED_MS = 45;

/**
 * Sustain (ms) for every event, index-aligned with `events`.
 *
 * A note is held until the next onset *in its own voice* — that is what turns
 * a written half note back into a half note instead of a short note followed
 * by silence. Chords (same onset) are skipped when looking ahead, and melody
 * and accompaniment are measured independently so a busy left hand cannot
 * clip the tune above it.
 *
 * `events` must be sorted by `atMs`.
 */
export function resolveDurations<T extends PerformedEvent>(
  events: T[],
  options?: DurationOptions<T>,
): number[] {
  const minMs = options?.minMs ?? MIN_SUSTAIN_MS;
  const maxMs = options?.maxMs ?? MAX_SUSTAIN_MS;
  const finalMs = options?.finalMs ?? FINAL_NOTE_MS;

  return events.map((event, index) => {
    if (
      typeof event.durationMs === 'number' &&
      Number.isFinite(event.durationMs) &&
      event.durationMs > 0
    ) {
      return Math.max(minMs, event.durationMs);
    }

    const role = roleOf(event);
    let next: T | null = null;
    for (let i = index + 1; i < events.length; i++) {
      const candidate = events[i];
      if (candidate.atMs <= event.atMs) {
        continue;
      }
      if (roleOf(candidate) !== role) {
        continue;
      }
      next = candidate;
      break;
    }

    if (next === null) {
      return Math.max(minMs, finalMs);
    }

    const span = next.atMs - event.atMs;
    const held = Math.min(maxMs, Math.max(minMs, span));
    if (!(options?.isSameNote?.(event, next) ?? false)) {
      return held;
    }
    // Scale the gap to the note so a fast repeat still separates audibly
    // instead of being swallowed by the ordinary minimum.
    const gap = Math.min(REARTICULATION_MS, span * 0.35);
    return Math.max(MIN_REARTICULATED_MS, held - gap);
  });
}

export type AccentOptions = {
  /** One beat in ms. Without it, only phrase-start shaping is applied. */
  beatMs?: number;
  /** Beats per bar (4 for 4/4, 3 for 3/4, 9 for a 9/8 aksak count). */
  beatsPerBar?: number;
  /** Beats within the bar that carry a secondary stress (0-based). */
  strongBeats?: number[];
  /** Where beat 0 of the first bar sits on the chart timeline. */
  barStartMs?: number;
};

function strongBeatsFor(beatsPerBar: number, explicit?: number[]): number[] {
  if (explicit) {
    return explicit;
  }
  // 4/4 leans on 3; 6/8 and 9/8 lean on each group of three.
  if (beatsPerBar === 4) {
    return [2];
  }
  if (beatsPerBar === 6) {
    return [3];
  }
  if (beatsPerBar === 9) {
    return [3, 6];
  }
  return [];
}

/**
 * Strike strength (0..1) for every event, index-aligned with `events`.
 *
 * Every note at one fixed loudness is what makes a correct transcription sound
 * like a ringtone: no downbeat, no phrasing, no shape. Given a beat length,
 * notes are weighted by where they fall in the bar; notes that open a phrase
 * (after a noticeable gap) get a small lift either way.
 */
export function resolveVelocities<T extends PerformedEvent>(
  events: T[],
  options?: AccentOptions,
): number[] {
  const beatMs = options?.beatMs;
  const beatsPerBar = options?.beatsPerBar ?? 4;
  const strong = strongBeatsFor(beatsPerBar, options?.strongBeats);
  const barStartMs = options?.barStartMs ?? 0;
  const barMs = beatMs ? beatMs * beatsPerBar : null;

  // A gap wider than most is heard as a breath — the note after it starts a
  // new phrase and wants a little more weight.
  const gaps: number[] = [];
  for (let i = 1; i < events.length; i++) {
    const gap = events[i].atMs - events[i - 1].atMs;
    if (gap > 0) {
      gaps.push(gap);
    }
  }
  const sortedGaps = [...gaps].sort((a, b) => a - b);
  const medianGap =
    sortedGaps.length > 0 ? sortedGaps[Math.floor(sortedGaps.length / 2)] : 0;
  const phraseGapMs = medianGap > 0 ? medianGap * 1.75 : Infinity;

  return events.map((event, index) => {
    if (
      typeof event.velocity === 'number' &&
      Number.isFinite(event.velocity) &&
      event.velocity > 0
    ) {
      return Math.min(1, Math.max(MIN_VELOCITY, event.velocity));
    }

    let velocity = BASE_VELOCITY;

    if (beatMs && barMs) {
      const intoBar = ((event.atMs - barStartMs) % barMs + barMs) % barMs;
      const beat = intoBar / beatMs;
      const nearestBeat = Math.round(beat);
      const onBeat = Math.abs(beat - nearestBeat) < 0.12;

      if (onBeat && nearestBeat % beatsPerBar === 0) {
        velocity += DOWNBEAT_BONUS;
      } else if (onBeat && strong.includes(nearestBeat % beatsPerBar)) {
        velocity += STRONG_BEAT_BONUS;
      } else if (!onBeat) {
        velocity -= OFFBEAT_PENALTY;
      }
    }

    const prev = index > 0 ? events[index - 1] : null;
    if (!prev || event.atMs - prev.atMs >= phraseGapMs) {
      velocity += PHRASE_START_BONUS;
    }

    if (roleOf(event) === 'accompaniment') {
      velocity *= ACCOMPANIMENT_SCALE;
    }

    return Math.min(1, Math.max(MIN_VELOCITY, velocity));
  });
}

/** Events the user is asked to play — accompaniment is heard, never scored. */
export function melodyEvents<T extends PerformedEvent>(events: T[]): T[] {
  return events.filter((event) => roleOf(event) === 'melody');
}
