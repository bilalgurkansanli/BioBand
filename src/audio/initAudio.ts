import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

let configured = false;

export async function initAudioMode(): Promise<void> {
  if (configured) {
    return;
  }

  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
  });

  configured = true;
}
