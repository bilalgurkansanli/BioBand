import { Directory, File, Paths } from 'expo-file-system';

import { getSharedAudioContext } from '../audio/sampleBank';
import { saveRecording } from '../storage/recordingsStorage';
import type { SavedRecording } from '../types/recording';
import { importKindOf, pickAudioDocument } from './documentPicker';
import { restoreLibrary } from './libraryBackup';
import { recordFeatureUse } from '../storage/profileProgressStorage';

export type ImportAudioResult =
  | { ok: true; kind: 'audio'; recording: SavedRecording }
  /** A library backup was recognised and merged in. */
  | { ok: true; kind: 'backup'; restored: number; skipped: number }
  | {
      ok: false;
      code:
        | 'canceled'
        | 'pickerUnavailable'
        | 'unsupported'
        | 'readFailed'
        /** A MIDI chart belongs to an instrument, not to the takes list. */
        | 'midiBelongsToTutorial'
        /** JSON that is neither a backup nor anything this screen can use. */
        | 'unknownJson';
    };

function getImportDirectory(): Directory {
  const dir = new Directory(Paths.document, 'BioBand Imports');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Brings a file into the takes list.
 *
 * Three kinds are accepted, and only one of them is audio:
 *  - **MP3** becomes a new take, decoded so its duration is real.
 *  - **JSON** is tried as a library backup and merged if it is one. This is
 *    the file the backup screen produces, and looking for it here is far more
 *    use than refusing it.
 *  - **MIDI** cannot land here at all: a chart has to target a specific
 *    instrument's keyboard, and this screen does not know which. The caller is
 *    told to open Tutorial Mode instead of being shown a vague failure.
 */
export async function importAudioRecording(): Promise<ImportAudioResult> {
  const picked = await pickAudioDocument();
  if (!picked.ok) {
    return picked;
  }

  const kind = importKindOf(picked.asset.name);
  if (kind === 'midi') {
    return { ok: false, code: 'midiBelongsToTutorial' };
  }

  if (kind === 'json') {
    try {
      const result = await restoreLibrary(picked.asset.uri);
      void recordFeatureUse('backupRestored');
      return { ok: true, kind: 'backup', ...result };
    } catch {
      return { ok: false, code: 'unknownJson' };
    }
  }

  try {
    const buffer = await getSharedAudioContext().decodeAudioData(picked.asset.uri);
    const durationMs = Math.round(buffer.duration * 1000);

    const fileName = `imported-${Date.now()}.mp3`;
    const destination = new File(getImportDirectory(), fileName);
    if (destination.exists) {
      destination.delete();
    }
    new File(picked.asset.uri).copy(destination);

    const recording: SavedRecording = {
      id: `${Date.now()}`,
      createdAt: Date.now(),
      // Imported audio isn't tied to any instrument — the field only needs a
      // valid value for typing; display always checks `source === 'imported'` first.
      instrument: 'piano',
      mode: 'microphone',
      durationMs,
      audioUri: destination.uri,
      title: picked.asset.name.replace(/\.[a-zA-Z0-9]+$/, ''),
      source: 'imported',
    };
    await saveRecording(recording);
    void recordFeatureUse('songImported');
    return { ok: true, kind: 'audio', recording };
  } catch {
    return { ok: false, code: 'readFailed' };
  }
}
