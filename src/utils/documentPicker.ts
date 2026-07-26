import { requireOptionalNativeModule } from 'expo-modules-core';
import { Platform } from 'react-native';

export type PickedDocument = {
  name: string;
  uri: string;
  mimeType?: string | null;
};

export type PickDocumentResult =
  | { ok: true; asset: PickedDocument }
  | { ok: false; code: 'canceled' | 'pickerUnavailable' };

type NativeDocumentPickerResult = {
  canceled?: boolean;
  assets?: { name: string; uri: string; mimeType?: string | null }[] | null;
};

type NativeDocumentPicker = {
  getDocumentAsync: (options: {
    type: string | string[];
    copyToCacheDirectory?: boolean;
    multiple?: boolean;
  }) => Promise<NativeDocumentPickerResult>;
};

/**
 * Optional native access — never import `expo-document-picker` at module
 * top-level: its `requireNativeModule` crashes when the binary lacks the
 * native module (stale custom APK / some Expo Go builds).
 */
function getNativeDocumentPicker(): NativeDocumentPicker | null {
  return requireOptionalNativeModule<NativeDocumentPicker>('ExpoDocumentPicker');
}

export function isDocumentPickerAvailable(): boolean {
  return getNativeDocumentPicker()?.getDocumentAsync != null;
}

export async function pickDocument(
  types: string | string[] = '*/*',
): Promise<PickDocumentResult> {
  const native = getNativeDocumentPicker();
  if (!native?.getDocumentAsync) {
    return { ok: false, code: 'pickerUnavailable' };
  }

  const typeList = Array.isArray(types) ? types : [types];

  try {
    const result = await native.getDocumentAsync({
      type: typeList.length === 1 ? typeList[0] : typeList,
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return { ok: false, code: 'canceled' };
    }

    const asset = result.assets[0];
    return {
      ok: true,
      asset: {
        name: asset.name,
        uri: asset.uri,
        mimeType: asset.mimeType,
      },
    };
  } catch (error) {
    console.warn('[pickDocument]', error);
    return { ok: false, code: 'pickerUnavailable' };
  }
}

/** The only extensions the Recordings importer will take. */
const IMPORT_EXTENSIONS = ['mp3', 'mid', 'midi', 'json'] as const;

export type ImportKind = 'audio' | 'midi' | 'json';

export function importKindOf(fileName: string): ImportKind | null {
  const ext = fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? '';
  if (ext === 'mp3') {
    return 'audio';
  }
  if (ext === 'mid' || ext === 'midi') {
    return 'midi';
  }
  if (ext === 'json') {
    return 'json';
  }
  return null;
}

/**
 * Recordings importer — MP3, MIDI and JSON only.
 *
 * The list used to end in `*​/*`, which made the system browser offer every
 * file on the device. A wildcard also cannot be narrowed afterwards, so the
 * only feedback was an error after the user had already chosen.
 *
 * The MIME types differ per platform on purpose. Android matches the list
 * literally against what the file provider reports, and plenty of providers
 * label a `.mid` or a downloaded `.json` as a generic binary — without
 * `application/octet-stream` those files show up greyed out and cannot be
 * picked at all. iOS maps each type to a UTI, where the octet-stream
 * equivalent (`public.data`) would let everything back in.
 */
export async function pickAudioDocument(): Promise<
  PickDocumentResult | { ok: false; code: 'unsupported' }
> {
  const types = ['audio/mpeg', 'audio/mp3', 'audio/midi', 'audio/x-midi', 'application/json'];
  const picked = await pickDocument(
    Platform.OS === 'android' ? [...types, 'application/octet-stream'] : types,
  );
  if (!picked.ok) {
    return picked;
  }

  // The picker is a hint, not a guarantee — a provider can still hand back
  // something else, so the extension is checked before anything is read.
  if (importKindOf(picked.asset.name) === null) {
    return { ok: false, code: 'unsupported' };
  }
  return picked;
}

export { IMPORT_EXTENSIONS };

/** The only extensions the Band Mode backing player can decode. */
const BACKING_AUDIO_EXTENSIONS = ['mp3', 'm4a', 'mp4', 'wav', 'aac', 'caf'] as const;

function isBackingAudioName(fileName: string): boolean {
  const ext = fileName.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? '';
  return (BACKING_AUDIO_EXTENSIONS as readonly string[]).includes(ext);
}

/**
 * Band Mode backing-track picker — audio only.
 *
 * Deliberately narrower than `pickAudioDocument`, which also takes MIDI and
 * JSON because the Recordings importer does something useful with both. Here
 * the file becomes the song's backing track: a chart handed to the audio
 * player is silence, and picking one used to overwrite the working track with
 * it under an `.mp3` name. Rejecting on the way in means the track already
 * attached to the song is never touched.
 */
export async function pickBackingAudioDocument(): Promise<
  PickDocumentResult | { ok: false; code: 'unsupported' }
> {
  const types = [
    'audio/mpeg',
    'audio/mp3',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/wav',
    'audio/x-wav',
  ];
  const picked = await pickDocument(
    // Same Android caveat as the other pickers: providers label plenty of
    // media as a generic binary, and the extension check below catches what
    // that lets through.
    Platform.OS === 'android' ? [...types, 'application/octet-stream'] : types,
  );
  if (!picked.ok) {
    return picked;
  }

  if (!isBackingAudioName(picked.asset.name)) {
    return { ok: false, code: 'unsupported' };
  }
  return picked;
}

/**
 * Chart picker — MIDI and song JSON only.
 *
 * The list used to end in `*​/*`, which made the system browser offer every
 * file on the device: photos, PDFs, anything. A wildcard also cannot be
 * narrowed afterwards, so the only feedback was an error after the user had
 * already chosen.
 *
 * The MIME types differ per platform on purpose. Android matches the list
 * literally against what the file provider reports, and plenty of providers
 * label a `.mid` as a generic binary — without `application/octet-stream`
 * those files show up greyed out and cannot be picked at all. iOS maps each
 * type to a UTI instead, where `public.midi-audio` already matches `.mid`
 * properly and the octet-stream equivalent (`public.data`) would let
 * everything back in.
 */
/**
 * Library backup picker — JSON only.
 *
 * Same Android caveat as the chart picker: plenty of providers report a
 * downloaded `.json` as a generic binary, and without `application/octet-stream`
 * the file the user is looking for is greyed out.
 */
export async function pickBackupDocument(): Promise<PickDocumentResult> {
  const types = ['application/json', 'text/json'];
  return pickDocument(
    Platform.OS === 'android' ? [...types, 'application/octet-stream'] : types,
  );
}

export async function pickChartDocument(): Promise<PickDocumentResult> {
  const types = [
    'audio/midi',
    'audio/mid',
    'audio/x-midi',
    'application/x-midi',
    'application/json',
    'text/json',
  ];

  return pickDocument(
    Platform.OS === 'android' ? [...types, 'application/octet-stream'] : types,
  );
}
