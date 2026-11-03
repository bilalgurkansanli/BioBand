import type { InstrumentEvent, InstrumentId, RecordingMode, SavedRecording } from '../types/recording';
import type { StudioProject, StudioTrack } from '../types/studio';
import { emptyList, readJsonOrFallback, updateJson, type JsonUpdate } from './jsonStorage';
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

function parseProjects(value: unknown): StudioProject[] | null {
  return Array.isArray(value)
    ? value.filter(isStudioProject).sort((a, b) => b.updatedAt - a.updatedAt)
    : null;
}

/**
 * Every write goes through here: one locked read-modify-write of the whole
 * list. Two edits landing together — a BPM change while a track patch is in
 * flight — used to read the same snapshot and persist over each other.
 */
function updateProjects<R>(
  update: (all: StudioProject[]) => JsonUpdate<StudioProject[], R>,
): Promise<R> {
  return updateJson(STORAGE_KEY, parseProjects, emptyList<StudioProject>, update);
}

/** `project` stamped as just edited, in its slot — or on top if it is new. */
function withProject(
  all: StudioProject[],
  project: StudioProject,
): { next: StudioProject[]; saved: StudioProject } {
  const saved = { ...project, updatedAt: Date.now() };
  const index = all.findIndex((entry) => entry.id === project.id);
  if (index < 0) {
    return { next: [saved, ...all], saved };
  }
  const next = [...all];
  next[index] = saved;
  return { next, saved };
}

/** Applies `edit` to one project and persists it; null when the project is gone. */
function updateOneProject(
  projectId: string,
  edit: (project: StudioProject) => StudioProject,
): Promise<StudioProject | null> {
  return updateProjects((all) => {
    const project = all.find((entry) => entry.id === projectId);
    if (!project) {
      return { result: null };
    }
    const { next, saved } = withProject(all, edit(project));
    return { next, result: saved };
  });
}

export function loadStudioProjects(): Promise<StudioProject[]> {
  return readJsonOrFallback(STORAGE_KEY, parseProjects, emptyList<StudioProject>);
}

export async function getStudioProject(projectId: string): Promise<StudioProject | null> {
  const all = await loadStudioProjects();
  return all.find((project) => project.id === projectId) ?? null;
}

export function createStudioProject(title: string): Promise<StudioProject> {
  const now = Date.now();
  const project: StudioProject = {
    id: `studio-${now}`,
    title: title.trim() || 'Studio',
    createdAt: now,
    updatedAt: now,
    tracks: [],
  };
  return updateProjects((all) => ({ next: [project, ...all], result: project }));
}

export function renameStudioProject(
  projectId: string,
  title: string,
): Promise<StudioProject | null> {
  return updateOneProject(projectId, (project) => ({
    ...project,
    title: title.trim() || project.title,
  }));
}

export function updateStudioProjectBpm(
  projectId: string,
  bpm: number,
): Promise<StudioProject | null> {
  const clamped = Math.min(240, Math.max(40, Math.round(bpm)));
  return updateOneProject(projectId, (project) => ({ ...project, bpm: clamped }));
}

export function deleteStudioProject(projectId: string): Promise<void> {
  return updateProjects((all) => {
    const project = all.find((entry) => entry.id === projectId);
    if (project) {
      for (const track of project.tracks) {
        if (track.audioUri) {
          deleteStudioTrackAudio(track.audioUri);
        }
      }
    }
    deleteStudioProjectAudio(projectId);
    return { next: all.filter((entry) => entry.id !== projectId), result: undefined };
  });
}

export function updateStudioProject(project: StudioProject): Promise<StudioProject> {
  return updateProjects((all) => {
    const { next, saved } = withProject(all, project);
    return { next, result: saved };
  });
}

export function updateStudioTrack(
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
  return updateOneProject(projectId, (project) => ({
    ...project,
    tracks: project.tracks.map((track) =>
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
    ),
  }));
}

export function removeStudioTrack(
  projectId: string,
  trackId: string,
): Promise<StudioProject | null> {
  return updateOneProject(projectId, (project) => {
    const removed = project.tracks.find((track) => track.id === trackId);
    if (removed?.audioUri) {
      deleteStudioTrackAudio(removed.audioUri);
    }
    return { ...project, tracks: project.tracks.filter((track) => track.id !== trackId) };
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
export function addTrackFromTake(
  projectId: string,
  take: SavedRecording,
): Promise<StudioProject | null> {
  return updateProjects((all) => {
    const project = all.find((entry) => entry.id === projectId);
    if (!project) {
      return { result: null };
    }
    if (take.mode === 'instrument' && (!take.events || take.events.length === 0)) {
      return { result: project };
    }
    if (take.mode === 'microphone' && !take.audioUri) {
      return { result: project };
    }
    const track = buildTrackFromTake(projectId, take, newTrackId());
    const { next, saved } = withProject(all, { ...project, tracks: [...project.tracks, track] });
    return { next, result: saved };
  });
}

/** Clone an existing track (new id, copied mic audio) and append it. */
export function duplicateStudioTrack(
  projectId: string,
  trackId: string,
): Promise<StudioProject | null> {
  return updateProjects((all) => {
    const project = all.find((entry) => entry.id === projectId);
    if (!project) {
      return { result: null };
    }
    const source = project.tracks.find((track) => track.id === trackId);
    if (!source) {
      return { result: project };
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

    const { next, saved } = withProject(all, { ...project, tracks: [...project.tracks, clone] });
    return { next, result: saved };
  });
}

/** Append a freshly recorded take as a Studio track (and keep the take separately). */
export function appendRecordedTrack(
  projectId: string,
  take: SavedRecording,
): Promise<StudioProject | null> {
  return addTrackFromTake(projectId, take);
}
