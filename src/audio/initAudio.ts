import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

let configured = false;

export async function restorePlaybackAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}

export async function initAudioMode(): Promise<void> {
  if (configured) {
    return;
  }

  await restorePlaybackAudioMode();
  configured = true;
}

export async function prepareRecordingAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}
