import AsyncStorage from '@react-native-async-storage/async-storage';

import type { InstrumentEvent, InstrumentId, RecordingMode, SavedRecording } from '../types/recording';
import type { StudioProject, StudioTrack } from '../types/studio';
import {
  copyStudioTrackAudio,
  deleteStudioProjectAudio,
  deleteStudioTrackAudio,
} from './studioAudioStorage';

const STORAGE_KEY = '@bioband/studio-projects.v1';

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
    (track.events === undefined ||
      (Array.isArray(track.events) && track.events.every(isInstrumentEvent))) &&
    (track.audioUri === undefined || typeof track.audioUri === 'string') &&
    (track.sourceTakeId === undefined || typeof track.sourceTakeId === 'string') &&
    (track.drumKitId === undefined || typeof track.drumKitId === 'string') &&
    (track.guitarVoiceId === undefined || typeof track.guitarVoiceId === 'string') &&
    (track.violinVoiceId === undefined || typeof track.violinVoiceId === 'string') &&
    (track.padBankId === undefined || typeof track.padBankId === 'string')
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
  patch: Partial<Pick<StudioTrack, 'muted' | 'solo' | 'volume'>>,
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
    events: take.events ? take.events.map((event) => ({ ...event })) : undefined,
    audioUri,
    sourceTakeId: take.id,
    drumKitId: take.drumKitId,
    guitarVoiceId: take.guitarVoiceId,
    violinVoiceId: take.violinVoiceId,
    padBankId: take.padBankId,
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

  const trackId = `track-${Date.now()}`;
  const track = buildTrackFromTake(projectId, take, trackId);
  return updateStudioProject({
    ...project,
    tracks: [...project.tracks, track],
  });
}

/** Append a freshly recorded take as a Studio track (and keep the take separately). */
export async function appendRecordedTrack(
  projectId: string,
  take: SavedRecording,
): Promise<StudioProject | null> {
  return addTrackFromTake(projectId, take);
}
