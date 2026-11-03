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

// None of these reject. They are awaited on the way into playback, recording
// and app boot, and a refused session change is no reason to abort any of
// those — App.tsx runs initAudioMode inside its boot Promise.all, where one
// rejection skipped the auth/data bootstrap and the instrument preload. A
// failure is logged and reported as `false` for callers that want to react.

async function applyAudioMode(
  label: string,
  mode: Parameters<typeof setAudioModeAsync>[0],
): Promise<boolean> {
  try {
    await setIsAudioActiveAsync(true);
    await setAudioModeAsync(mode);
    return true;
  } catch (error) {
    console.warn(`Audio: could not switch to the ${label} audio mode`, error);
    return false;
  }
}

export async function restorePlaybackAudioMode(): Promise<boolean> {
  return applyAudioMode('playback', {
    playsInSilentMode: true,
    allowsRecording: false,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}

export async function initAudioMode(): Promise<boolean> {
  if (configured) {
    return true;
  }

  alignNativeAudioApiSession();
  // Only a successful setup is remembered, so a later call can retry.
  configured = await restorePlaybackAudioMode();
  return configured;
}

export async function prepareRecordingAudioMode(): Promise<boolean> {
  return applyAudioMode('recording', {
    playsInSilentMode: true,
    allowsRecording: true,
    interruptionMode: 'doNotMix',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}

/** Mic overdub: allow beds to keep playing while recording. */
export async function prepareOverdubRecordingAudioMode(): Promise<boolean> {
  return applyAudioMode('overdub recording', {
    playsInSilentMode: true,
    allowsRecording: true,
    interruptionMode: 'mixWithOthers',
    shouldPlayInBackground: false,
    shouldRouteThroughEarpiece: false,
  });
}
