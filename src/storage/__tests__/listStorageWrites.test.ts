import AsyncStorage from '@react-native-async-storage/async-storage';

import { corruptBackupKey } from '../jsonStorage';
import { loadRecordings, renameRecording, saveRecording } from '../recordingsStorage';
import {
  createStudioProject,
  loadStudioProjects,
  updateStudioProject,
  updateStudioProjectBpm,
  updateStudioTrack,
} from '../studioProjectsStorage';
import type { SavedRecording } from '../../types/recording';
import type { StudioProject } from '../../types/studio';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
// File copies and deletes are not what these tests are about.
jest.mock('../studioAudioStorage', () => ({
  copyStudioTrackAudio: jest.fn(),
  deleteStudioProjectAudio: jest.fn(),
  deleteStudioTrackAudio: jest.fn(),
}));
jest.mock('../recordingAudioStorage', () => ({
  deleteRecordingAudio: jest.fn(),
  migrateCachedRecordingAudio: jest.fn(() => null),
}));

const PROJECTS_KEY = '@bioband/studio-projects.v1';
const RECORDINGS_KEY = '@bioband/recordings';

function take(id: string): SavedRecording {
  return { id, createdAt: 1, instrument: 'piano', mode: 'instrument', durationMs: 1000, events: [] };
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
  jest.spyOn(console, 'warn').mockImplementation(() => undefined);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('studio projects', () => {
  async function projectWithTrack(): Promise<StudioProject> {
    const project = await createStudioProject('Demo');
    return updateStudioProject({
      ...project,
      tracks: [
        {
          id: 't1',
          instrument: 'piano',
          mode: 'instrument',
          createdAt: 1,
          durationMs: 1000,
          muted: false,
          solo: false,
          volume: 1,
          events: [],
        },
      ],
    });
  }

  it('keeps both a track patch and a BPM change made at the same time', async () => {
    const project = await projectWithTrack();

    await Promise.all([
      updateStudioTrack(project.id, 't1', { muted: true }),
      updateStudioProjectBpm(project.id, 90),
      updateStudioTrack(project.id, 't1', { volume: 0.5 }),
    ]);

    const [saved] = await loadStudioProjects();
    expect(saved.bpm).toBe(90);
    expect(saved.tracks[0]).toMatchObject({ muted: true, volume: 0.5 });
  });

  it('refuses to create a project over a list it could not read', async () => {
    await projectWithTrack();
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk I/O'));

    await expect(createStudioProject('Second')).rejects.toThrow();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await expect(loadStudioProjects()).resolves.toHaveLength(1);
  });

  it('sets a corrupt list aside instead of silently overwriting it', async () => {
    await AsyncStorage.setItem(PROJECTS_KEY, '[{"id": "broken"');
    await createStudioProject('Fresh');
    await expect(AsyncStorage.getItem(corruptBackupKey(PROJECTS_KEY))).resolves.toBe(
      '[{"id": "broken"',
    );
    await expect(loadStudioProjects()).resolves.toHaveLength(1);
  });
});

describe('recordings', () => {
  it('keeps every take saved concurrently', async () => {
    await Promise.all([saveRecording(take('a')), saveRecording(take('b')), saveRecording(take('c'))]);
    const ids = (await loadRecordings()).map((entry) => entry.id).sort();
    expect(ids).toEqual(['a', 'b', 'c']);
  });

  it('does not lose a rename racing a save', async () => {
    await saveRecording(take('a'));
    await Promise.all([renameRecording('a', 'Renamed'), saveRecording(take('b'))]);
    const all = await loadRecordings();
    expect(all.find((entry) => entry.id === 'a')?.title).toBe('Renamed');
    expect(all.map((entry) => entry.id).sort()).toEqual(['a', 'b']);
  });

  it('refuses to save over a library it could not read', async () => {
    await saveRecording(take('a'));
    jest.clearAllMocks();
    jest.mocked(AsyncStorage.getItem).mockRejectedValueOnce(new Error('disk I/O'));

    await expect(saveRecording(take('b'))).rejects.toThrow();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
    await expect(AsyncStorage.getItem(RECORDINGS_KEY)).resolves.toContain('"a"');
  });
});
