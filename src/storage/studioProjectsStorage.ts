import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InstrumentEvent, InstrumentId, RecordingMode, SavedRecording } from '../types/recording';
import type { StudioProject, StudioTrack } from '../types/studio';
import {
  copyStudioTrackAudio,
  deleteStudioProjectAudio,
  deleteStudioTrackAudio,
} from './studioAudioStorage';

const STORAGE_KEY = '@bioband/studio-projects.v1';

/** Timestamp alone collides when two tracks are added in the same millisecond
 * (e.g. tapping Duplicate twice quickly), which would break React keys and make
 * a patch hit both copies. */
function newTrackId(): string {
  return `track-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isInstrumentId(value: unknown): value is InstrumentId {
  return (
    value === 'piano' ||
    value === 'drums' ||
    value === 'guitar' ||
    value === 'violin' ||
    value === 'pads'
  );
}

function isRecordingMode(value: unknown): value is RecordingMode {
  return value === 'instrument' || value === 'microphone';
}

function isInstrumentEvent(value: unknown): value is InstrumentEvent {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as InstrumentEvent;
  return typeof entry.soundId === 'string' && typeof entry.atMs === 'number';
}

function isStudioTrack(value: unknown): value is StudioTrack {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const track = value as StudioTrack;
  return (
    typeof track.id === 'string' &&
    isInstrumentId(track.instrument) &&
    isRecordingMode(track.mode) &&
    typeof track.createdAt === 'number' &&
    typeof track.durationMs === 'number' &&
    typeof track.muted === 'boolean' &&
    typeof track.solo === 'boolean' &&
    typeof track.volume === 'number' &&
    (track.startMs === undefined || typeof track.startMs === 'number') &&
    (track.events === undefined ||
      (Array.isArray(track.events) && track.events.every(isInstrumentEvent))) &&
    (track.audioUri === undefined || typeof track.audioUri === 'string') &&
    (track.sourceTakeId === undefined || typeof track.sourceTakeId === 'string') &&
    (track.drumKitId === undefined || typeof track.drumKitId === 'string') &&
    (track.guitarVoiceId === undefined || typeof track.guitarVoiceId === 'string') &&
    (track.violinVoiceId === undefined || typeof track.violinVoiceId === 'string') &&
    (track.padBankId === undefined || typeof track.padBankId === 'string') &&
    (track.pianoVoiceId === undefined || typeof track.pianoVoiceId === 'string')
  );
}

function isStudioProject(value: unknown): value is StudioProject {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const project = value as StudioProject;
  return (
    typeof project.id === 'string' &&
    typeof project.title === 'string' &&
    typeof project.createdAt === 'number' &&
    typeof project.updatedAt === 'number' &&
    (project.bpm === undefined || typeof project.bpm === 'number') &&
    Array.isArray(project.tracks) &&
    project.tracks.every(isStudioTrack)
  );
}

async function persist(projects: StudioProject[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(projects));
}

export async function loadStudioProjects(): Promise<StudioProject[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(isStudioProject).sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export async function getStudioProject(projectId: string): Promise<StudioProject | null> {
  const all = await loadStudioProjects();
  return all.find((project) => project.id === projectId) ?? null;
}

export async function createStudioProject(title: string): Promise<StudioProject> {
  const now = Date.now();
  const project: StudioProject = {
    id: `studio-${now}`,
    title: title.trim() || 'Studio',
    createdAt: now,
    updatedAt: now,
    tracks: [],
  };
  const all = await loadStudioProjects();
  all.unshift(project);
  await persist(all);
  return project;
}

export async function renameStudioProject(
  projectId: string,
  title: string,
): Promise<StudioProject | null> {
  const all = await loadStudioProjects();
  const index = all.findIndex((project) => project.id === projectId);
  if (index < 0) {
    return null;
  }
  const next: StudioProject = {
    ...all[index],
    title: title.trim() || all[index].title,
    updatedAt: Date.now(),
  };
  all[index] = next;
  await persist(all);
  return next;
}

export async function updateStudioProjectBpm(
  projectId: string,
  bpm: number,
): Promise<StudioProject | null> {
  const clamped = Math.min(240, Math.max(40, Math.round(bpm)));
  const all = await loadStudioProjects();
  const index = all.findIndex((project) => project.id === projectId);
  if (index < 0) {
    return null;
  }
  const next: StudioProject = { ...all[index], bpm: clamped, updatedAt: Date.now() };
  all[index] = next;
  await persist(all);
  return next;
}

export async function deleteStudioProject(projectId: string): Promise<void> {
  const all = await loadStudioProjects();
  const project = all.find((entry) => entry.id === projectId);
  if (project) {
    for (const track of project.tracks) {
      if (track.audioUri) {
        deleteStudioTrackAudio(track.audioUri);
      }
    }
  }
  deleteStudioProjectAudio(projectId);
  await persist(all.filter((entry) => entry.id !== projectId));
}

export async function updateStudioProject(
  project: StudioProject,
): Promise<StudioProject> {
  const all = await loadStudioProjects();
  const index = all.findIndex((entry) => entry.id === project.id);
  const next = { ...project, updatedAt: Date.now() };
  if (index < 0) {
    all.unshift(next);
  } else {
    all[index] = next;
  }
  await persist(all);
  return next;
}

export async function updateStudioTrack(
  projectId: string,
  trackId: string,
  patch: Partial<
    Pick<
      StudioTrack,
      | 'muted'
      | 'solo'
      | 'volume'
      | 'startMs'
      | 'drumKitId'
      | 'guitarVoiceId'
      | 'violinVoiceId'
      | 'padBankId'
      | 'pianoVoiceId'
    >
  >,
): Promise<StudioProject | null> {
  const project = await getStudioProject(projectId);
  if (!project) {
    return null;
  }
  const tracks = project.tracks.map((track) =>
    track.id === trackId
      ? {
          ...track,
          ...patch,
          volume:
            patch.volume === undefined
              ? track.volume
              : Math.min(1, Math.max(0, patch.volume)),
          startMs:
            patch.startMs === undefined
              ? track.startMs
              : Math.max(0, Math.round(patch.startMs)),
        }
      : track,
  );
  return updateStudioProject({ ...project, tracks });
}

export async function removeStudioTrack(
  projectId: string,
  trackId: string,
): Promise<StudioProject | null> {
  const project = await getStudioProject(projectId);
  if (!project) {
    return null;
  }
  const removed = project.tracks.find((track) => track.id === trackId);
  if (removed?.audioUri) {
    deleteStudioTrackAudio(removed.audioUri);
  }
  return updateStudioProject({
    ...project,
    tracks: project.tracks.filter((track) => track.id !== trackId),
  });
}

function buildTrackFromTake(
  projectId: string,
  take: SavedRecording,
  trackId: string,
): StudioTrack {
  let audioUri = take.audioUri;
  if (take.mode === 'microphone' && take.audioUri) {
    audioUri = copyStudioTrackAudio(projectId, trackId, take.audioUri);
  }

  return {
    id: trackId,
    instrument: take.instrument,
    mode: take.mode,
    createdAt: Date.now(),
    durationMs: take.durationMs,
    muted: false,
    solo: false,
    volume: 1,
    startMs: 0,
    events: take.events ? take.events.map((event) => ({ ...event })) : undefined,
    audioUri,
    sourceTakeId: take.id,
    drumKitId: take.drumKitId,
    guitarVoiceId: take.guitarVoiceId,
    violinVoiceId: take.violinVoiceId,
    padBankId: take.padBankId,
    pianoVoiceId: take.pianoVoiceId,
  };
}

/** Embed a saved take as a new Studio track (copies mic audio into Documents). */
export async function addTrackFromTake(
  projectId: string,
  take: SavedRecording,
): Promise<StudioProject | null> {
  const project = await getStudioProject(projectId);
  if (!project) {
    return null;
  }

  if (take.mode === 'instrument' && (!take.events || take.events.length === 0)) {
    return project;
  }
  if (take.mode === 'microphone' && !take.audioUri) {
    return project;
  }

  const trackId = newTrackId();
  const track = buildTrackFromTake(projectId, take, trackId);
  return updateStudioProject({
    ...project,
    tracks: [...project.tracks, track],
  });
}

/** Clone an existing track (new id, copied mic audio) and append it. */
export async function duplicateStudioTrack(
  projectId: string,
  trackId: string,
): Promise<StudioProject | null> {
  const project = await getStudioProject(projectId);
  if (!project) {
    return null;
  }
  const source = project.tracks.find((track) => track.id === trackId);
  if (!source) {
    return project;
  }

  const newId = newTrackId();
  let audioUri = source.audioUri;
  if (source.mode === 'microphone' && source.audioUri) {
    // Give the copy its own file so deleting one never removes the other's audio.
    audioUri = copyStudioTrackAudio(projectId, newId, source.audioUri);
  }

  const clone: StudioTrack = {
    ...source,
    id: newId,
    createdAt: Date.now(),
    events: source.events ? source.events.map((event) => ({ ...event })) : undefined,
    audioUri,
  };

  return updateStudioProject({
    ...project,
    tracks: [...project.tracks, clone],
  });
}

/** Append a freshly recorded take as a Studio track (and keep the take separately). */
export async function appendRecordedTrack(
  projectId: string,
  take: SavedRecording,
): Promise<StudioProject | null> {
  return addTrackFromTake(projectId, take);
}
