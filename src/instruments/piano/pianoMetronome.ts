import { getMasterInput, getSharedAudioContext } from '../../audio/sampleBank';

export const METRONOME_BPM_MIN = 40;
export const METRONOME_BPM_MAX = 200;
export const METRONOME_BPM_DEFAULT = 100;

let bpm = METRONOME_BPM_DEFAULT;
let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;

function clampBpm(value: number): number {
  return Math.min(METRONOME_BPM_MAX, Math.max(METRONOME_BPM_MIN, Math.round(value)));
}

function playClick(): void {
  try {
    const context = getSharedAudioContext();
    if (context.state === 'suspended') {
      void context.resume();
    }

    const now = context.currentTime;
    const osc = context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1000;

    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(0.22, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.028);

    osc.connect(gain);
    gain.connect(getMasterInput());
    osc.start(now);
    osc.stop(now + 0.04);
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
  const ms = (60_000 / bpm);
  playClick();
  intervalId = setInterval(playClick, ms);
}

export function getMetronomeBpm(): number {
  return bpm;
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

export function startMetronome(nextBpm = bpm): void {
  bpm = clampBpm(nextBpm);
  running = true;
  armTimer();
}

export function stopMetronome(): void {
  running = false;
  clearTimer();
}
