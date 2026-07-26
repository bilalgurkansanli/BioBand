import { Platform, Share } from 'react-native';

/** Optional — only works after a native build that includes expo-sharing. */
export async function tryExpoSharing() {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      return Sharing;
    }
  } catch {
    // Native module missing in the current dev client — fall back to RN Share.
  }
  return null;
}

/**
 * Hands a file to the system share sheet.
 *
 * Falls back to React Native's own `Share` when expo-sharing is not in the
 * binary, which keeps sharing working on older dev clients instead of failing
 * outright.
 */
export async function shareFile(
  uri: string,
  mimeType: string,
  dialogTitle: string,
  uti = 'public.data',
): Promise<void> {
  const Sharing = await tryExpoSharing();
  if (Sharing) {
    await Sharing.shareAsync(uri, { dialogTitle, mimeType, UTI: uti });
    return;
  }

  await Share.share({
    title: dialogTitle,
    message: Platform.OS === 'android' ? uri : undefined,
    url: uri,
  });
}
