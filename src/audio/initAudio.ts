import { setAudioModeAsync, setIsAudioActiveAsync } from 'expo-audio';

import { AudioManager } from './audioApi';

let configured = false;

/**
 * On iOS, `expo-audio` (mic recording/bed playback) and `react-native-audio-api`
 * (the shared synth engine for all 5 instruments) each independently manage
 * the process-wide AVAudioSession — `react-native-audio-api`'s engine
 * re-applies ITS category every time it restarts (which happens constantly
 * during normal play), defaulting to plain `playback` (no recording, no
 * mixing) unless told otherwise. Left unconfigured, that default can silently
 * stomp the recording-enabled category `expo-audio` sets for a Studio
 * overdub (instrument playback + mic recording running concurrently) —
 * degrading or corrupting the mic take. Configuring it up front to the same
 * category/options `expo-audio` uses means whichever library (re)applies the
 * session, the result is compatible rather than a fight. Android has no
 * equivalent global session concept, so this has no effect there.
 */
function alignNativeAudioApiSession(): void {
  try {
    AudioManager.setAudioSessionOptions({
      iosCategory: 'playAndRecord',
      iosOptions: ['mixWithOthers', 'defaultToSpeaker', 'allowBluetoothA2DP'],
    });
  } catch (error) {
    console.warn('Audio: could not align react-native-audio-api session options', error);
  }
}

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

  alignNativeAudioApiSession();
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

/** Mic overdub: allow beds to keep playing while recording. */
export async function prepareOverdubRecordingAudioMode(): Promise<void> {
  await setIsAudioActiveAsync(true);
  await setAudioModeAsync({
    playsInSilentMode: true,
    allowsRecording: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}
