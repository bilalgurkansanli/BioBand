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

export async function pickAudioDocument(): Promise<
  PickDocumentResult | { ok: false; code: 'unsupported' }
> {
  const picked = await pickDocument([
    'audio/*',
    'audio/mpeg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/wav',
    'video/mp4',
    '*/*',
  ]);
  if (!picked.ok) {
    return picked;
  }

  const name = picked.asset.name;
  const ext = name.match(/\.([a-zA-Z0-9]+)$/)?.[1]?.toLowerCase() ?? '';
  const mime = picked.asset.mimeType ?? '';
  const okExt = ['mp3', 'm4a', 'wav', 'aac', 'caf', 'mp4'].includes(ext);
  const okMime =
    (mime.startsWith('audio/') || mime === 'video/mp4') &&
    !mime.includes('midi');
  if (!okExt && !okMime) {
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
