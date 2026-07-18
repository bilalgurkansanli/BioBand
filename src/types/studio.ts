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
  events?: InstrumentEvent[];
  /** Durable Documents URI for microphone tracks. */
  audioUri?: string;
  sourceTakeId?: string;
};

export type StudioProject = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  tracks: StudioTrack[];
};

export function getProjectDurationMs(project: StudioProject): number {
  if (project.tracks.length === 0) {
    return 0;
  }
  return Math.max(...project.tracks.map((track) => track.durationMs));
}

export function isTrackAudible(track: StudioTrack, tracks: StudioTrack[]): boolean {
  const anySolo = tracks.some((entry) => entry.solo);
  if (anySolo) {
    return track.solo && !track.muted && track.volume >= 0.05;
  }
  return !track.muted && track.volume >= 0.05;
}
