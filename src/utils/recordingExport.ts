import { Directory, File, Paths } from 'expo-file-system';

import { encodeMp3Pcm16Async } from '../audio/pcmEncode';
import { renderRecordingPcm } from '../audio/recordingRender';
import { renderProjectPcm } from '../audio/studioProjectRender';
import type { SavedRecording } from '../types/recording';
import type { StudioProject } from '../types/studio';
import { shareFile, tryExpoSharing } from './shareFile';

export type ExportOptions = {
  /** 0..1 while the take is being encoded. Skipped entirely for plain copies. */
  onProgress?: (ratio: number) => void;
  /** Polled during encoding — return `true` to abort. */
  shouldCancel?: () => boolean;
  /**
   * Fired once the file exists and before any system sheet is presented.
   * The progress UI has to be torn down at that point: iOS refuses to present
   * the share sheet on top of a view controller that is already presenting
   * one, which a still-visible React Native modal counts as.
   */
  onFilePrepared?: () => void;
};

export type RecordingExport = {
  uri: string;
  mimeType: string;
  fileName: string;
};

export type DownloadResult =
  | { status: 'saved'; fileName: string; location: 'folder' | 'documents' }
  | { status: 'shared'; fileName: string }
  | { status: 'canceled' };

/**
 * Containers that already hold AAC inside an ISO base-media box.
 *
 * Microphone takes are captured with `RecordingPresets.HIGH_QUALITY`, which is
 * AAC in an MPEG-4 container on both platforms — `.m4a` and `.mp4` are the same
 * file with two names. Exporting one as MP4 is therefore a byte copy: no
 * decode, no re-encode, no wait.
 */
const MP4_EXTENSIONS = new Set(['m4a', 'mp4', 'm4b', 'mov']);

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'm4a';
}

/**
 * Letters the app's three languages actually produce, folded to ASCII.
 *
 * Stripping non-ASCII instead would gut Turkish and German titles — "Şımarık"
 * becomes "-m-r-k" and "Grün" becomes "gr-n". Note that `ı` does not decompose
 * under Unicode normalisation, so a table is the only way to fold it.
 */
const ASCII_FOLD: Record<string, string> = {
  ç: 'c', Ç: 'c',
  ğ: 'g', Ğ: 'g',
  ı: 'i', İ: 'i',
  ö: 'o', Ö: 'o',
  ş: 's', Ş: 's',
  ü: 'u', Ü: 'u',
  ä: 'a', Ä: 'a',
  ß: 'ss',
  â: 'a', à: 'a', á: 'a',
  ê: 'e', è: 'e', é: 'e',
  î: 'i', ì: 'i', í: 'i',
  ô: 'o', ò: 'o', ó: 'o',
  û: 'u', ù: 'u', ú: 'u',
  ñ: 'n', Ñ: 'n',
};

/** A user-typed name turned into a safe, readable file-name segment. */
function slugifyTitle(title: string, maxLength = 40): string {
  const folded = Array.from(title.trim())
    .map((char) => ASCII_FOLD[char] ?? char)
    .join('');
  return folded
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/g, '');
}

function datePart(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('');
}

function timePart(date: Date): string {
  return [
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('');
}

function buildBaseName(recording: SavedRecording): string {
  const date = new Date(recording.createdAt);
  // The name the user gave the take is far more use than the minute it was
  // recorded — they already know which one "keman1" is. Untitled takes keep
  // the clock time, which is the only thing that tells them apart.
  const title = slugifyTitle(recording.title ?? '');
  return `bioband-${recording.instrument}-${datePart(date)}-${title || timePart(date)}`;
}

function buildProjectBaseName(project: StudioProject): string {
  const date = new Date();
  const title = slugifyTitle(project.title, 32);
  return `bioband-${title || 'project'}-${datePart(date)}-${timePart(date)}`;
}

function getExportDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'bioband-exports');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function getDocumentsExportDirectory(): Directory {
  const dir = new Directory(Paths.document, 'BioBand Recordings');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function mimeTypeForAudioExt(ext: string): string {
  if (ext === 'wav') {
    return 'audio/wav';
  }
  if (ext === 'mp3') {
    return 'audio/mpeg';
  }
  if (ext === 'caf') {
    return 'audio/x-caf';
  }
  if (ext === 'aac') {
    return 'audio/aac';
  }
  return 'audio/mp4';
}

function freshExportFile(fileName: string): File {
  const destination = new File(getExportDirectory(), fileName);
  if (destination.exists) {
    destination.delete();
  }
  return destination;
}

/**
 * Builds the file a take is exported as.
 *
 * Anything already captured to disk — microphone takes and imported files — is
 * copied verbatim, which is instant and lossless. Only instrument takes, which
 * are stored as note events rather than audio, have to be bounced and encoded,
 * and that is the one path that can take a while.
 */
export async function prepareRecordingExport(
  recording: SavedRecording,
  options: ExportOptions = {},
): Promise<RecordingExport> {
  const baseName = buildBaseName(recording);

  if (recording.audioUri) {
    const sourceExt = extensionFromUri(recording.audioUri);
    const extension = MP4_EXTENSIONS.has(sourceExt) ? 'mp4' : sourceExt;
    const fileName = `${baseName}.${extension}`;
    const destination = freshExportFile(fileName);
    new File(recording.audioUri).copy(destination);

    options.onProgress?.(1);
    return {
      uri: destination.uri,
      mimeType: mimeTypeForAudioExt(extension),
      fileName,
    };
  }

  options.onProgress?.(0);
  const { channels, sampleRate } = await renderRecordingPcm(recording);
  const mp3Bytes = await encodeMp3Pcm16Async(channels, sampleRate, {
    onProgress: options.onProgress,
    shouldCancel: options.shouldCancel,
  });

  const fileName = `${baseName}.mp3`;
  const destination = freshExportFile(fileName);
  destination.create();
  destination.write(mp3Bytes);

  return { uri: destination.uri, mimeType: 'audio/mpeg', fileName };
}

/** Bounces a whole Studio project to a single file (mix of all audible tracks). */
export async function prepareProjectExport(
  project: StudioProject,
  options: ExportOptions = {},
): Promise<RecordingExport> {
  options.onProgress?.(0);
  const { channels, sampleRate } = await renderProjectPcm(project);
  const mp3Bytes = await encodeMp3Pcm16Async(channels, sampleRate, {
    onProgress: options.onProgress,
    shouldCancel: options.shouldCancel,
  });

  const fileName = `${buildProjectBaseName(project)}.mp3`;
  const destination = freshExportFile(fileName);
  destination.create();
  destination.write(mp3Bytes);

  return { uri: destination.uri, mimeType: 'audio/mpeg', fileName };
}

async function shareWithSystemSheet(
  exported: RecordingExport,
  dialogTitle: string,
): Promise<void> {
  await shareFile(exported.uri, exported.mimeType, dialogTitle, 'public.audio');
}

function isPickerCancellation(error: unknown): boolean {
  // Android rejects with ERR_PICKER_CANCELLED, iOS with
  // ERR_FILE_PICKING_CANCELLED — match the shared word rather than either code.
  const code = (error as { code?: string } | null)?.code ?? '';
  const message = error instanceof Error ? error.message : '';
  return /cancel/i.test(code) || /cancel/i.test(message);
}

/**
 * Writes the export into a folder the user picks.
 *
 * Returns `null` when the device has no folder picker at all — an older dev
 * client, or a platform where the native module is missing — so the caller can
 * fall back to the share sheet rather than leaving the user with nothing.
 * A cancelled picker is a deliberate "no", and reports itself as such.
 */
async function saveToPickedFolder(
  exported: RecordingExport,
): Promise<'saved' | 'canceled' | null> {
  // The picker hands back the module's own base `Directory`, which is a
  // slightly narrower type than the one re-exported for hand-built paths.
  let folder: Awaited<ReturnType<typeof Directory.pickDirectoryAsync>>;
  try {
    folder = await Directory.pickDirectoryAsync();
  } catch (error) {
    return isPickerCancellation(error) ? 'canceled' : null;
  }

  const target = folder.createFile(exported.fileName, exported.mimeType);
  target.write(await new File(exported.uri).bytes());
  return 'saved';
}

/**
 * Saves an already-prepared export.
 * Folder picker first, share sheet second, app Documents folder last.
 */
async function saveExport(exported: RecordingExport): Promise<DownloadResult> {
  const picked = await saveToPickedFolder(exported);
  if (picked === 'saved') {
    return { status: 'saved', fileName: exported.fileName, location: 'folder' };
  }
  if (picked === 'canceled') {
    return { status: 'canceled' };
  }

  const Sharing = await tryExpoSharing();
  if (Sharing) {
    await Sharing.shareAsync(exported.uri, {
      dialogTitle: exported.fileName,
      mimeType: exported.mimeType,
      UTI: 'public.audio',
    });
    return { status: 'shared', fileName: exported.fileName };
  }

  const destination = new File(getDocumentsExportDirectory(), exported.fileName);
  if (destination.exists) {
    destination.delete();
  }
  new File(exported.uri).copy(destination);
  return { status: 'saved', fileName: exported.fileName, location: 'documents' };
}

export async function shareRecording(
  recording: SavedRecording,
  dialogTitle: string,
  options: ExportOptions = {},
): Promise<void> {
  const exported = await prepareRecordingExport(recording, options);
  options.onFilePrepared?.();
  await shareWithSystemSheet(exported, dialogTitle);
}

export async function downloadRecording(
  recording: SavedRecording,
  options: ExportOptions = {},
): Promise<DownloadResult> {
  const exported = await prepareRecordingExport(recording, options);
  options.onFilePrepared?.();
  return saveExport(exported);
}

export async function shareProject(
  project: StudioProject,
  dialogTitle: string,
  options: ExportOptions = {},
): Promise<void> {
  const exported = await prepareProjectExport(project, options);
  options.onFilePrepared?.();
  await shareWithSystemSheet(exported, dialogTitle);
}

export async function downloadProject(
  project: StudioProject,
  options: ExportOptions = {},
): Promise<DownloadResult> {
  const exported = await prepareProjectExport(project, options);
  options.onFilePrepared?.();
  return saveExport(exported);
}
