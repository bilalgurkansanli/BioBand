import type { InstrumentEvent, InstrumentId, RecordingMode } from './recording';

export type StudioTrack = {
  id: string;
  instrument: InstrumentId;
  mode: RecordingMode;
  createdAt: number;
  durationMs: number;
  muted: boolean;
  solo: boolean;
  /** 0..1 — mic uses player.volume; event tracks treat < 0.05 as silent. */
  volume: number;
  /**
   * Clip start position on the project timeline, in ms from project start.
   * Absent/0 = pinned to the origin (legacy tracks). Draggable in the studio
   * timeline; shifts this track's playback by delaying every event.
   */
  startMs?: number;
  events?: InstrumentEvent[];
  /** Durable Documents URI for microphone tracks. */
  audioUri?: string;
  sourceTakeId?: string;
  /** Drum kit the take was performed with (drums tracks only). */
  drumKitId?: string;
  /** Guitar voice the take was performed with (guitar tracks only). */
  guitarVoiceId?: string;
  /** Violin voice the take was performed with (violin tracks only). */
  violinVoiceId?: string;
  /** Pad bank the take was performed with (pads tracks only). */
  padBankId?: string;
  /** Piano voice for playback timbre (piano tracks only). */
  pianoVoiceId?: string;
};

export type StudioProject = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  tracks: StudioTrack[];
  /** Musical tempo for the timeline grid + clip snapping (default 120). */
  bpm?: number;
};

export const DEFAULT_BPM = 120;
export const MIN_BPM = 40;
export const MAX_BPM = 240;

export function getProjectBpm(project: StudioProject): number {
  const bpm = project.bpm ?? DEFAULT_BPM;
  return Math.min(MAX_BPM, Math.max(MIN_BPM, Math.round(bpm)));
}

/**
 * Playback speed multiplier for a tempo. Takes were recorded free-form, so
 * DEFAULT_BPM is treated as "as recorded" (1.0x): 240 BPM plays twice as fast,
 * 60 BPM half as fast.
 */
export function bpmToRate(bpm: number): number {
  return bpm / DEFAULT_BPM;
}

export function getProjectRate(project: StudioProject): number {
  return bpmToRate(getProjectBpm(project));
}

export function getTrackStartMs(track: StudioTrack): number {
  return Math.max(0, track.startMs ?? 0);
}

export function getTrackEndMs(track: StudioTrack): number {
  return getTrackStartMs(track) + track.durationMs;
}

export function getProjectDurationMs(project: StudioProject): number {
  if (project.tracks.length === 0) {
    return 0;
  }
  return Math.max(...project.tracks.map((track) => getTrackEndMs(track)));
}

export function isTrackAudible(track: StudioTrack, tracks: StudioTrack[]): boolean {
  const anySolo = tracks.some((entry) => entry.solo);
  if (anySolo) {
    return track.solo && !track.muted && track.volume >= 0.05;
  }
  return !track.muted && track.volume >= 0.05;
}
