import { Directory, File, Paths } from 'expo-file-system';

import { getSharedAudioContext } from '../audio/sampleBank';
import { saveRecording } from '../storage/recordingsStorage';
import type { SavedRecording } from '../types/recording';
import { pickAudioDocument } from './documentPicker';

export type ImportAudioResult =
  | { ok: true; recording: SavedRecording }
  | { ok: false; code: 'canceled' | 'pickerUnavailable' | 'unsupported' | 'readFailed' };

function getImportDirectory(): Directory {
  const dir = new Directory(Paths.document, 'BioBand Imports');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Imports an external audio file (mp3/mp4/m4a/wav/...) as a new microphone-mode recording. */
export async function importAudioRecording(): Promise<ImportAudioResult> {
  const picked = await pickAudioDocument();
  if (!picked.ok) {
    return { ok: false, code: picked.code };
  }

  try {
    const buffer = await getSharedAudioContext().decodeAudioData(picked.asset.uri);
    const durationMs = Math.round(buffer.duration * 1000);

    const ext = picked.asset.name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? 'm4a';
    const fileName = `imported-${Date.now()}.${ext}`;
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
    return { ok: true, recording };
  } catch {
    return { ok: false, code: 'readFailed' };
  }
}
