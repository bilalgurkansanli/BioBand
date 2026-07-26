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
