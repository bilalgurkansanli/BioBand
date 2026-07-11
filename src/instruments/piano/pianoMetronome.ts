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
let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function clampBpm(value: number): number {
  return Math.min(METRONOME_BPM_MAX, Math.max(METRONOME_BPM_MIN, Math.round(value)));
}

function getSoundProfile(id: MetronomeSoundId): MetronomeSoundProfile {
  return METRONOME_SOUNDS.find((sound) => sound.id === id) ?? METRONOME_SOUNDS[0];
}

function playClick(profile = getSoundProfile(soundId)): void {
  try {
    const context = getSharedAudioContext();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const now = context.currentTime;
    const attack = profile.attackMs / 1000;
    const release = profile.releaseMs / 1000;

    const osc = context.createOscillator();
    osc.type = profile.type;
    osc.frequency.value = profile.frequency;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(profile.peakGain, now + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + attack + release);

    osc.connect(gain);
    gain.connect(getMasterInput());
    osc.start(now);
    osc.stop(now + attack + release + 0.01);
  } catch (error) {
    console.warn('Metronome click failed', error);
  }
}

function clearTimer(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function armTimer(): void {
  clearTimer();
  if (!running) {
    return;
  }
  const ms = 60_000 / bpm;
  playClick();
  intervalId = setInterval(() => playClick(), ms);
}

export function getMetronomeBpm(): number {
  return bpm;
}

export function getMetronomeSoundId(): MetronomeSoundId {
  return soundId;
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
  playClick(getSoundProfile(nextSoundId));
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
}
