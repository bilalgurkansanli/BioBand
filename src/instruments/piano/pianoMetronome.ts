import { getMasterInput, getSharedAudioContext } from '../../audio/sampleBank';

export const METRONOME_BPM_MIN = 40;
export const METRONOME_BPM_MAX = 200;
export const METRONOME_BPM_DEFAULT = 100;

export type MetronomeSoundId =
  | 'classic'
  | 'soft'
  | 'sharp'
  | 'wood'
  | 'digital';

/** Click grid relative to the quarter-note BPM. */
export type MetronomeSubdivision =
  | 'quarter'
  | 'eighth'
  | 'sixteenth'
  | 'backbeat';

export const METRONOME_SUBDIVISIONS: readonly MetronomeSubdivision[] = [
  'quarter',
  'eighth',
  'sixteenth',
  'backbeat',
] as const;

type MetronomeSoundProfile = {
  id: MetronomeSoundId;
  labelKey: string;
  type: OscillatorType;
  frequency: number;
  peakGain: number;
  attackMs: number;
  releaseMs: number;
};

export const METRONOME_SOUNDS: readonly MetronomeSoundProfile[] = [
  {
    id: 'classic',
    labelKey: 'piano.metronome.sounds.classic',
    type: 'sine',
    frequency: 1000,
    peakGain: 0.22,
    attackMs: 2,
    releaseMs: 28,
  },
  {
    id: 'soft',
    labelKey: 'piano.metronome.sounds.soft',
    type: 'sine',
    frequency: 780,
    peakGain: 0.14,
    attackMs: 4,
    releaseMs: 55,
  },
  {
    id: 'sharp',
    labelKey: 'piano.metronome.sounds.sharp',
    type: 'square',
    frequency: 1250,
    peakGain: 0.1,
    attackMs: 1,
    releaseMs: 18,
  },
  {
    id: 'wood',
    labelKey: 'piano.metronome.sounds.wood',
    type: 'triangle',
    frequency: 520,
    peakGain: 0.28,
    attackMs: 1,
    releaseMs: 35,
  },
  {
    id: 'digital',
    labelKey: 'piano.metronome.sounds.digital',
    type: 'sawtooth',
    frequency: 1600,
    peakGain: 0.08,
    attackMs: 1,
    releaseMs: 22,
  },
] as const;

let bpm = METRONOME_BPM_DEFAULT;
let soundId: MetronomeSoundId = 'classic';
let subdivision: MetronomeSubdivision = 'quarter';
let running = false;

// Lookahead scheduler ("A Tale of Two Clocks"): a coarse JS timer wakes up
// often and schedules the upcoming clicks precisely on the audio clock via
// osc.start(when). This keeps the beat rock-solid even when the JS thread is
// busy — a plain setInterval that plays "now" on each fire drifts audibly.
const SCHEDULER_INTERVAL_MS = 25;
const SCHEDULE_AHEAD_SECONDS = 0.12;

let schedulerId: ReturnType<typeof setInterval> | null = null;
/** Audio-clock time of the next tick to schedule. */
let nextTickTime = 0;
/** Advances every tick (subdivision unit or quarter for backbeat). */
let tickIndex = 0;

function clampBpm(value: number): number {
  return Math.min(METRONOME_BPM_MAX, Math.max(METRONOME_BPM_MIN, Math.round(value)));
}

function getSoundProfile(id: MetronomeSoundId): MetronomeSoundProfile {
  return METRONOME_SOUNDS.find((sound) => sound.id === id) ?? METRONOME_SOUNDS[0];
}

function ticksPerBeat(): number {
  switch (subdivision) {
    case 'eighth':
      return 2;
    case 'sixteenth':
      return 4;
    case 'quarter':
    case 'backbeat':
    default:
      return 1;
  }
}

function shouldPlayTick(index: number): boolean {
  if (subdivision !== 'backbeat') {
    return true;
  }
  // 4/4: click only on beats 2 and 4 (0-based indices 1 and 3).
  const beatInBar = index % 4;
  return beatInBar === 1 || beatInBar === 3;
}

function isAccentTick(index: number): boolean {
  if (subdivision === 'backbeat') {
    return false;
  }
  const tpb = ticksPerBeat();
  const beatInBar = Math.floor(index / tpb) % 4;
  const subBeat = index % tpb;
  return beatInBar === 0 && subBeat === 0;
}

function playClick(
  when: number,
  profile = getSoundProfile(soundId),
  accent = false,
): void {
  try {
    const context = getSharedAudioContext();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const attack = profile.attackMs / 1000;
    const release = profile.releaseMs / 1000;
    const peak = accent ? profile.peakGain * 1.4 : profile.peakGain * 0.72;
    const freq = accent ? profile.frequency * 1.18 : profile.frequency;

    const osc = context.createOscillator();
    osc.type = profile.type;
    osc.frequency.value = freq;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);

    osc.connect(gain);
    gain.connect(getMasterInput());
    osc.start(when);
    osc.stop(when + attack + release + 0.01);
  } catch (error) {
    console.warn('Metronome click failed', error);
  }
}

/** Play a click immediately (sound preview from the settings modal). */
function previewClick(profile: MetronomeSoundProfile, accent = false): void {
  playClick(getSharedAudioContext().currentTime, profile, accent);
}

/**
 * Schedule one click at an exact audio-clock time with the user's chosen
 * metronome sound — count-ins (pads looper) reuse the same click.
 * Returns a cancel: pre-scheduled clicks must die when the count-in aborts.
 */
export function scheduleCountInClickAt(when: number, accent = false): () => void {
  try {
    const context = getSharedAudioContext();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const profile = getSoundProfile(soundId);
    const attack = profile.attackMs / 1000;
    const release = profile.releaseMs / 1000;
    const peak = accent ? profile.peakGain * 1.4 : profile.peakGain * 0.72;

    const osc = context.createOscillator();
    osc.type = profile.type;
    osc.frequency.value = accent ? profile.frequency * 1.18 : profile.frequency;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(peak, when + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + attack + release);

    osc.connect(gain);
    gain.connect(getMasterInput());
    osc.start(when);
    osc.stop(when + attack + release + 0.01);

    return () => {
      try {
        osc.stop();
        gain.disconnect();
      } catch {
        // Already finished.
      }
    };
  } catch (error) {
    console.warn('Count-in click failed', error);
    return () => {};
  }
}

function clearTimer(): void {
  if (schedulerId) {
    clearInterval(schedulerId);
    schedulerId = null;
  }
}

/** Seconds between successive ticks at the current tempo / subdivision. */
function tickIntervalSeconds(): number {
  return 60 / bpm / ticksPerBeat();
}

/** Schedule a single tick at an exact audio-clock time. */
function scheduleTick(index: number, when: number): void {
  if (shouldPlayTick(index)) {
    playClick(when, getSoundProfile(soundId), isAccentTick(index));
  }
}

/** Schedule every tick that falls inside the lookahead window. */
function runScheduler(): void {
  if (!running) {
    return;
  }
  const context = getSharedAudioContext();
  if (context.state === 'suspended') {
    void context.resume();
  }
  while (nextTickTime < context.currentTime + SCHEDULE_AHEAD_SECONDS) {
    scheduleTick(tickIndex, nextTickTime);
    nextTickTime += tickIntervalSeconds();
    tickIndex += 1;
  }
}

function armTimer(): void {
  clearTimer();
  if (!running) {
    return;
  }
  tickIndex = 0;
  // Start a hair in the future so the first click is scheduled, never late.
  nextTickTime = getSharedAudioContext().currentTime + 0.06;
  runScheduler();
  schedulerId = setInterval(runScheduler, SCHEDULER_INTERVAL_MS);
}

export function getMetronomeBpm(): number {
  return bpm;
}

export function getMetronomeSoundId(): MetronomeSoundId {
  return soundId;
}

export function getMetronomeSubdivision(): MetronomeSubdivision {
  return subdivision;
}

export function isMetronomeRunning(): boolean {
  return running;
}

export function setMetronomeBpm(nextBpm: number): void {
  bpm = clampBpm(nextBpm);
  if (running) {
    armTimer();
  }
}

export function setMetronomeSound(nextSoundId: MetronomeSoundId): void {
  soundId = nextSoundId;
  // Preview the chosen click immediately.
  previewClick(getSoundProfile(nextSoundId), true);
  if (running) {
    armTimer();
  }
}

export function setMetronomeSubdivision(next: MetronomeSubdivision): void {
  subdivision = next;
  if (running) {
    armTimer();
  }
}

export function startMetronome(nextBpm = bpm): void {
  bpm = clampBpm(nextBpm);
  running = true;
  armTimer();
}

export function stopMetronome(): void {
  running = false;
  clearTimer();
  tickIndex = 0;
}
