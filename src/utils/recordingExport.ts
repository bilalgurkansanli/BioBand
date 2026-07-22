import { Directory, File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';

import { encodeMp3Pcm16 } from '../audio/pcmEncode';
import { renderRecordingPcm } from '../audio/recordingRender';
import type { SavedRecording } from '../types/recording';

export type AudioExportFormat = 'mp3' | 'mp4';

export class UnsupportedExportFormatError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsupportedExportFormatError';
  }
}

export type RecordingExport = {
  uri: string;
  mimeType: string;
  fileName: string;
  kind: 'audio' | 'json';
};

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  return match?.[1]?.toLowerCase() ?? 'm4a';
}

function buildBaseName(recording: SavedRecording): string {
  const date = new Date(recording.createdAt);
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
    '-',
    String(date.getHours()).padStart(2, '0'),
    String(date.getMinutes()).padStart(2, '0'),
  ].join('');
  return `bioband-${recording.instrument}-${stamp}`;
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
  return 'audio/mp4';
}

/** Optional — only works after a native rebuild that includes expo-sharing. */
async function tryExpoSharing() {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      return Sharing;
    }
  } catch {
    // Native module missing in current dev client — use RN Share / file copy.
  }
  return null;
}

/**
 * Builds a shareable/downloadable file for a recording.
 * Microphone → audio file copy; instrument → JSON event export.
 */
export async function prepareRecordingExport(
  recording: SavedRecording,
): Promise<RecordingExport> {
  const exportDir = getExportDirectory();
  const baseName = buildBaseName(recording);

  if (recording.mode === 'microphone' && recording.audioUri) {
    const ext = extensionFromUri(recording.audioUri);
    const fileName = `${baseName}.${ext}`;
    const destination = new File(exportDir, fileName);
    if (destination.exists) {
      destination.delete();
    }
    new File(recording.audioUri).copy(destination);

    return {
      uri: destination.uri,
      mimeType: mimeTypeForAudioExt(ext),
      fileName,
      kind: 'audio',
    };
  }

  const fileName = `${baseName}.json`;
  const destination = new File(exportDir, fileName);
  if (destination.exists) {
    destination.delete();
  }
  destination.create();
  destination.write(
    JSON.stringify(
      {
        format: 'bioband-recording-v1',
        id: recording.id,
        createdAt: recording.createdAt,
        instrument: recording.instrument,
        mode: recording.mode,
        durationMs: recording.durationMs,
        events: recording.events ?? [],
      },
      null,
      2,
    ),
  );

  return {
    uri: destination.uri,
    mimeType: 'application/json',
    fileName,
    kind: 'json',
  };
}

/**
 * Exports a recording as a standard audio file (MP3 or MP4).
 * Microphone takes are already an MP4-container AAC file (`RecordingPresets.HIGH_QUALITY`),
 * so MP4 export is a plain copy/relabel. MP3 is always available: it's encoded from
 * decoded PCM with a pure-JS encoder, so it also works for instrument-mode takes
 * (dry-bounced through an offline render — see `renderRecordingPcm`).
 * MP4 has no such path for instrument-mode takes (no AAC encoder available) and
 * throws `UnsupportedExportFormatError`.
 */
export async function prepareRecordingAudioExport(
  recording: SavedRecording,
  format: AudioExportFormat,
): Promise<RecordingExport> {
  const exportDir = getExportDirectory();
  const baseName = buildBaseName(recording);

  if (format === 'mp4') {
    if (recording.mode !== 'microphone' || !recording.audioUri) {
      throw new UnsupportedExportFormatError(
        'MP4 export is only available for microphone recordings.',
      );
    }
    const fileName = `${baseName}.mp4`;
    const destination = new File(exportDir, fileName);
    if (destination.exists) {
      destination.delete();
    }
    new File(recording.audioUri).copy(destination);

    return {
      uri: destination.uri,
      mimeType: 'audio/mp4',
      fileName,
      kind: 'audio',
    };
  }

  const { channels, sampleRate } = await renderRecordingPcm(recording);
  const mp3Bytes = encodeMp3Pcm16(channels, sampleRate);

  const fileName = `${baseName}.mp3`;
  const destination = new File(exportDir, fileName);
  if (destination.exists) {
    destination.delete();
  }
  destination.create();
  destination.write(mp3Bytes);

  return {
    uri: destination.uri,
    mimeType: 'audio/mpeg',
    fileName,
    kind: 'audio',
  };
}

/** True when `format` can be produced for this recording (used to gate the export UI). */
export function canExportAudioFormat(
  recording: SavedRecording,
  format: AudioExportFormat,
): boolean {
  if (format === 'mp4') {
    return recording.mode === 'microphone' && !!recording.audioUri;
  }
  return recording.mode === 'microphone'
    ? !!recording.audioUri
    : (recording.events?.length ?? 0) > 0;
}

export async function shareRecordingAsAudio(
  recording: SavedRecording,
  format: AudioExportFormat,
  dialogTitle: string,
): Promise<void> {
  const exported = await prepareRecordingAudioExport(recording, format);
  await shareWithSystemSheet(exported, dialogTitle);
}

export async function downloadRecordingAsAudio(
  recording: SavedRecording,
  format: AudioExportFormat,
): Promise<DownloadResult> {
  const exported = await prepareRecordingAudioExport(recording, format);
  const Sharing = await tryExpoSharing();

  if (Sharing) {
    await Sharing.shareAsync(exported.uri, {
      dialogTitle: exported.fileName,
      mimeType: exported.mimeType,
      UTI: 'public.audio',
    });
    return { destination: 'share', fileName: exported.fileName };
  }

  const docsDir = getDocumentsExportDirectory();
  const destination = new File(docsDir, exported.fileName);
  if (destination.exists) {
    destination.delete();
  }
  new File(exported.uri).copy(destination);

  return { destination: 'documents', fileName: exported.fileName };
}

async function shareWithSystemSheet(
  exported: RecordingExport,
  dialogTitle: string,
): Promise<void> {
  const Sharing = await tryExpoSharing();
  if (Sharing) {
    await Sharing.shareAsync(exported.uri, {
      dialogTitle,
      mimeType: exported.mimeType,
      UTI: exported.kind === 'audio' ? 'public.audio' : 'public.json',
    });
    return;
  }

  // Fallback without expo-sharing native module (current dev client).
  if (exported.kind === 'json') {
    const text = await new File(exported.uri).text();
    await Share.share({
      title: dialogTitle,
      message: text,
    });
    return;
  }

  await Share.share({
    title: dialogTitle,
    message: Platform.OS === 'android' ? exported.uri : undefined,
    url: exported.uri,
  });
}

export async function shareRecording(
  recording: SavedRecording,
  dialogTitle: string,
): Promise<void> {
  const exported = await prepareRecordingExport(recording);
  await shareWithSystemSheet(exported, dialogTitle);
}

export type DownloadResult = {
  destination: 'documents' | 'share';
  fileName: string;
};

/**
 * Saves/exports the recording.
 * Prefers the system share/save sheet when available; otherwise copies into Documents.
 */
export async function downloadRecording(
  recording: SavedRecording,
): Promise<DownloadResult> {
  const exported = await prepareRecordingExport(recording);
  const Sharing = await tryExpoSharing();

  if (Sharing) {
    await Sharing.shareAsync(exported.uri, {
      dialogTitle: exported.fileName,
      mimeType: exported.mimeType,
      UTI: exported.kind === 'audio' ? 'public.audio' : 'public.json',
    });
    return { destination: 'share', fileName: exported.fileName };
  }

  const docsDir = getDocumentsExportDirectory();
  const destination = new File(docsDir, exported.fileName);
  if (destination.exists) {
    destination.delete();
  }
  new File(exported.uri).copy(destination);

  return { destination: 'documents', fileName: exported.fileName };
}
