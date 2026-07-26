import { Directory, File, Paths } from 'expo-file-system';
import * as Application from 'expo-application';

import { loadRecordings, saveRecording } from '../storage/recordingsStorage';
import type { SavedRecording } from '../types/recording';
import { prepareRecordingExport } from './recordingExport';

const FORMAT = 'bioband-library-v1';

/**
 * Ceiling on the audio a single backup may carry.
 *
 * Everything is base64'd into one JSON document, so the peak cost is roughly
 * twice this in strings before the file is written. Instrument takes are note
 * events and weigh almost nothing; only microphone and imported takes count
 * against it, which is why the limit can be this generous.
 */
const MAX_AUDIO_BYTES = 80 * 1024 * 1024;

export class BackupTooLargeError extends Error {
  constructor(readonly totalBytes: number) {
    super('Library audio exceeds the backup size limit.');
    this.name = 'BackupTooLargeError';
  }
}

export class BackupUnreadableError extends Error {
  constructor(message = 'Not a BioBand library backup.') {
    super(message);
    this.name = 'BackupUnreadableError';
  }
}

type AudioBlob = { ext: string; base64: string };

type BackupFile = {
  format: typeof FORMAT;
  exportedAt: number;
  appVersion: string;
  /** Takes with `audioUri` swapped for `audioRef` into the blob table. */
  recordings: (Omit<SavedRecording, 'audioUri'> & { audioRef?: string })[];
  audio: Record<string, AudioBlob>;
};

export type BackupProgress = (ratio: number) => void;

export type ExportedBackup = {
  uri: string;
  fileName: string;
  recordingCount: number;
  audioCount: number;
  bytes: number;
};

export type RestoreResult = {
  restored: number;
  /** Already present, matched by id — restoring twice is not destructive. */
  skipped: number;
};

function extensionOf(uri: string): string {
  return uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/)?.[1]?.toLowerCase() ?? 'm4a';
}

function backupDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'bioband-backups');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Where restored audio lands. Kept apart so a restore never overwrites a live take. */
function restoredAudioDirectory(): Directory {
  const dir = new Directory(Paths.document, 'BioBand Restored');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function timestamp(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('');
}

/**
 * Packs the whole library — every take, its notes, and the audio bytes of any
 * microphone or imported recording — into one JSON file.
 *
 * This is the only safety net there is: cloud sync carries profile progress
 * and settings, never recordings, so a lost phone is a lost library.
 */
export async function exportLibrary(onProgress?: BackupProgress): Promise<ExportedBackup> {
  const recordings = await loadRecordings();

  const withAudio = recordings.filter((take) => !!take.audioUri);

  // Weigh the audio before reading any of it — failing after ten minutes of
  // base64 encoding would be a poor way to learn the library is too big.
  let totalBytes = 0;
  for (const take of withAudio) {
    try {
      totalBytes += new File(take.audioUri as string).info().size ?? 0;
    } catch {
      // A missing file is skipped below; it should not block the backup.
    }
  }
  if (totalBytes > MAX_AUDIO_BYTES) {
    throw new BackupTooLargeError(totalBytes);
  }

  const audio: Record<string, AudioBlob> = {};
  const entries: BackupFile['recordings'] = [];
  let done = 0;

  for (const take of recordings) {
    const { audioUri, ...rest } = take;
    if (!audioUri) {
      entries.push(rest);
    } else {
      try {
        const file = new File(audioUri);
        const ref = `a${entries.length}`;
        audio[ref] = { ext: extensionOf(audioUri), base64: await file.base64() };
        entries.push({ ...rest, audioRef: ref });
      } catch {
        // The take is worth keeping even if its audio has gone missing —
        // its title, date and duration still mean something to the user.
        entries.push(rest);
      }
    }
    done += 1;
    onProgress?.(recordings.length ? done / recordings.length : 1);
  }

  const payload: BackupFile = {
    format: FORMAT,
    exportedAt: Date.now(),
    appVersion: `${Application.nativeApplicationVersion ?? '?'} (${
      Application.nativeBuildVersion ?? '?'
    })`,
    recordings: entries,
    audio,
  };

  const fileName = `bioband-library-${timestamp(new Date())}.json`;
  const destination = new File(backupDirectory(), fileName);
  if (destination.exists) {
    destination.delete();
  }
  destination.create();
  destination.write(JSON.stringify(payload));

  onProgress?.(1);
  return {
    uri: destination.uri,
    fileName,
    recordingCount: entries.length,
    audioCount: Object.keys(audio).length,
    bytes: destination.info().size ?? 0,
  };
}

export class NoFolderPickedError extends Error {
  constructor() {
    super('No destination folder was chosen.');
    this.name = 'NoFolderPickedError';
  }
}

export type AudioExportResult = {
  written: number;
  /** Takes with neither audio nor events — nothing to render. */
  skipped: number;
};

/**
 * Writes every take into a folder the user picks, as playable audio.
 *
 * This is *not* a backup and the UI must not call it one: note events, titles,
 * instrument voices and kit choices are all left behind, so nothing here can
 * be restored into the app. It is for getting the music out — onto a computer,
 * into a message, into another audio tool.
 *
 * One file per take, because that is what audio is. Instrument takes are
 * rendered and encoded to MP3; microphone and imported takes are copied in the
 * format they were captured in rather than re-encoded, which would be slower
 * and lossier for no gain.
 */
export async function exportLibraryAsAudio(
  onProgress?: BackupProgress,
  shouldCancel?: () => boolean,
): Promise<AudioExportResult> {
  const recordings = await loadRecordings();

  let folder: Awaited<ReturnType<typeof Directory.pickDirectoryAsync>>;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch {
    throw new NoFolderPickedError();
  }

  let written = 0;
  let skipped = 0;

  for (const [index, take] of recordings.entries()) {
    if (shouldCancel?.()) {
      break;
    }
    try {
      const exported = await prepareRecordingExport(take);
      const target = folder.createFile(exported.fileName, exported.mimeType);
      target.write(await new File(exported.uri).bytes());
      written += 1;
    } catch {
      // An empty or broken take should not abandon the other fifty.
      skipped += 1;
    }
    onProgress?.((index + 1) / Math.max(1, recordings.length));
  }

  onProgress?.(1);
  return { written, skipped };
}

function isBackupFile(value: unknown): value is BackupFile {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const doc = value as BackupFile;
  return doc.format === FORMAT && Array.isArray(doc.recordings);
}

/**
 * Merges a backup into the library.
 *
 * Takes already present (matched by id) are left alone rather than replaced,
 * so restoring the same file twice cannot duplicate or clobber anything.
 */
export async function restoreLibrary(
  fileUri: string,
  onProgress?: BackupProgress,
): Promise<RestoreResult> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(await new File(fileUri).text());
  } catch {
    throw new BackupUnreadableError();
  }
  if (!isBackupFile(parsed)) {
    throw new BackupUnreadableError();
  }

  const existing = await loadRecordings();
  const existingIds = new Set(existing.map((take) => take.id));
  const audio = parsed.audio ?? {};

  let restored = 0;
  let skipped = 0;
  let done = 0;

  for (const entry of parsed.recordings) {
    done += 1;
    onProgress?.(parsed.recordings.length ? done / parsed.recordings.length : 1);

    if (!entry || typeof entry.id !== 'string') {
      continue;
    }
    if (existingIds.has(entry.id)) {
      skipped += 1;
      continue;
    }

    const { audioRef, ...rest } = entry;
    const take = rest as SavedRecording;

    const blob = audioRef ? audio[audioRef] : undefined;
    if (blob?.base64) {
      try {
        const target = new File(restoredAudioDirectory(), `${entry.id}.${blob.ext || 'm4a'}`);
        if (target.exists) {
          target.delete();
        }
        target.create();
        target.write(blob.base64, { encoding: 'base64' });
        take.audioUri = target.uri;
      } catch {
        // Without its audio the take cannot play, so it is not worth adding.
        continue;
      }
    }

    await saveRecording(take);
    existingIds.add(entry.id);
    restored += 1;
  }

  onProgress?.(1);
  return { restored, skipped };
}
