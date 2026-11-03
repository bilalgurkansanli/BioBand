import type {
  InstrumentEvent,
  InstrumentId,
  RecordingMode,
  RecordingSource,
  SavedRecording,
} from '../types/recording';

/**
 * Ceiling on the audio a single backup may carry.
 *
 * Everything is base64'd into one JSON document, so the peak cost is roughly
 * twice this in strings before the file is written. Instrument takes are note
 * events and weigh almost nothing; only microphone and imported takes count
 * against it, which is why the limit can be this generous.
 */
export const MAX_BACKUP_AUDIO_BYTES = 80 * 1024 * 1024;

/**
 * Largest file a restore will open.
 *
 * Derived from what an export can produce — the audio ceiling grown by a third
 * for base64, plus room for the note events and metadata — so every backup
 * this app has written still restores. Anything larger did not come from here,
 * and reading it whole into a JS string, then parsing that, is what an
 * oversized file would turn into an out-of-memory kill.
 */
export const MAX_BACKUP_FILE_BYTES =
  Math.ceil((MAX_BACKUP_AUDIO_BYTES * 4) / 3) + 16 * 1024 * 1024;

/**
 * Ids become file names (`<id>.<ext>`), so only characters that cannot climb
 * out of the restore directory — no `/`, no `..`, nothing the file system
 * treats specially. Every id the app generates already fits.
 */
const SAFE_ID = /^[A-Za-z0-9_-]{1,64}$/;

/** The formats a take's audio is ever recorded or imported in. */
const AUDIO_EXTENSIONS = ['m4a', 'mp3', 'wav', 'aac', 'caf', 'mp4'] as const;

const INSTRUMENTS: readonly InstrumentId[] = ['piano', 'drums', 'guitar', 'violin', 'pads'];
const MODES: readonly RecordingMode[] = ['instrument', 'microphone'];
const SOURCES: readonly RecordingSource[] = ['instrument', 'drumMachine', 'imported'];

const MAX_TITLE_LENGTH = 120;
const MAX_VOICE_ID_LENGTH = 64;

export type BackupAudioBlob = { ext: string; base64: string };

/** A take from a backup, checked and rebuilt field by field, ready to save. */
export type RestorableTake = {
  /** Never carries `audioUri`: that is set only to a file the restore wrote. */
  recording: Omit<SavedRecording, 'audioUri'>;
  /** The audio to write for it, already validated. */
  audio: BackupAudioBlob | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function oneOf<T extends string>(options: readonly T[], value: unknown): T | undefined {
  return options.find((option) => option === value);
}

function finiteAtLeastZero(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : undefined;
}

function shortString(value: unknown, maxLength: number): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value.slice(0, maxLength) : undefined;
}

export function isSafeRecordingId(value: unknown): value is string {
  return typeof value === 'string' && SAFE_ID.test(value);
}

function sanitizeEvent(value: unknown): InstrumentEvent | null {
  if (!isRecord(value) || typeof value.soundId !== 'string' || value.soundId.length > 64) {
    return null;
  }
  const atMs = finiteAtLeastZero(value.atMs);
  if (atMs === undefined) {
    return null;
  }
  const velocity =
    typeof value.velocity === 'number' && Number.isFinite(value.velocity)
      ? Math.min(1, Math.max(0, value.velocity))
      : undefined;
  return velocity === undefined
    ? { soundId: value.soundId, atMs }
    : { soundId: value.soundId, atMs, velocity };
}

/** The blob, if it is one this app could have written; null otherwise. */
export function sanitizeAudioBlob(value: unknown): BackupAudioBlob | null {
  if (!isRecord(value) || typeof value.base64 !== 'string' || value.base64.length === 0) {
    return null;
  }
  const ext = oneOf(AUDIO_EXTENSIONS, typeof value.ext === 'string' ? value.ext.toLowerCase() : '');
  return ext ? { ext, base64: value.base64 } : null;
}

/**
 * Rebuilds one backup entry from only the fields a take has, each checked
 * against its type, or returns null when the entry cannot become a take.
 *
 * A backup is a file anyone can hand the user, so nothing in it is trusted:
 *  - An unsafe id is replaced with `newId()` — it is about to name a file.
 *  - `audioUri` is never copied across. It would point at whatever file the
 *    author chose, and that file is what playback reads and what deleting the
 *    take removes. An entry that names external audio *instead of* carrying
 *    its own is dropped outright.
 *  - A microphone take whose audio is missing or unusable is kept only if the
 *    backup never claimed to carry audio for it — the export does that for
 *    takes whose file had already gone, and their title and date still matter.
 */
export function sanitizeBackupEntry(
  entry: unknown,
  audioTable: Record<string, unknown>,
  newId: () => string,
): RestorableTake | null {
  if (!isRecord(entry)) {
    return null;
  }
  const instrument = oneOf(INSTRUMENTS, entry.instrument);
  const mode = oneOf(MODES, entry.mode);
  if (!instrument || !mode) {
    return null;
  }

  const audioRef = typeof entry.audioRef === 'string' ? entry.audioRef : undefined;
  // Own properties only — a ref of "__proto__" or "constructor" must not
  // reach into the object's prototype.
  const audio =
    audioRef !== undefined && Object.prototype.hasOwnProperty.call(audioTable, audioRef)
      ? sanitizeAudioBlob(audioTable[audioRef])
      : null;
  if (!audio && (audioRef !== undefined || entry.audioUri !== undefined)) {
    // Promised audio that is not there, or audio living somewhere else.
    return null;
  }

  const recording: Omit<SavedRecording, 'audioUri'> = {
    id: isSafeRecordingId(entry.id) ? entry.id : newId(),
    createdAt: finiteAtLeastZero(entry.createdAt) ?? Date.now(),
    instrument,
    mode,
    durationMs: finiteAtLeastZero(entry.durationMs) ?? 0,
  };
  if (Array.isArray(entry.events)) {
    recording.events = entry.events
      .map(sanitizeEvent)
      .filter((event): event is InstrumentEvent => event !== null);
  }
  const title = shortString(entry.title, MAX_TITLE_LENGTH);
  if (title !== undefined) {
    recording.title = title;
  }
  const source = oneOf(SOURCES, entry.source);
  if (source !== undefined) {
    recording.source = source;
  }
  for (const key of [
    'drumKitId',
    'guitarVoiceId',
    'violinVoiceId',
    'padBankId',
    'pianoVoiceId',
  ] as const) {
    const voice = shortString(entry[key], MAX_VOICE_ID_LENGTH);
    if (voice !== undefined) {
      recording[key] = voice;
    }
  }
  return { recording, audio };
}
