// Import core runtime modules directly so Metro does not pull in optional UI
// components (AudioControls) that require gesture-handler / reanimated.
import AudioContext from 'react-native-audio-api/lib/module/core/AudioContext';
import OfflineAudioContext from 'react-native-audio-api/lib/module/core/OfflineAudioContext';
import type { AudioBuffer, AudioNode, GainNode } from 'react-native-audio-api';

export { AudioContext, OfflineAudioContext };
export type { AudioBuffer, AudioNode, GainNode };
