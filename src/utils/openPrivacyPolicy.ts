import { Linking } from 'react-native';

/**
 * Rendered directly by GitHub (no separate hosting needed) — requires
 * PRIVACY.md to exist on the `main` branch for this link to resolve.
 */
export const PRIVACY_POLICY_URL =
  'https://github.com/bilalgurkansanli/BioBand/blob/main/PRIVACY.md';

export async function openPrivacyPolicy(): Promise<void> {
  const canOpen = await Linking.canOpenURL(PRIVACY_POLICY_URL);
  if (!canOpen) {
    throw new Error(`Cannot open privacy policy URL: ${PRIVACY_POLICY_URL}`);
  }
  await Linking.openURL(PRIVACY_POLICY_URL);
}
