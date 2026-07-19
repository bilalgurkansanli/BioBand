import { createAudioPlayer, type AudioPlayer } from 'expo-audio';

import { restorePlaybackAudioMode } from './initAudio';
import { stopAllVoices } from './sampleBank';
import {
  initDrumsEngine,
  playHit,
  releaseDrumsEngine,
  setDrumKit,
} from '../instruments/drums/drumsEngine';
import { isDrumKitId } from '../instruments/drums/drumsKits';
import type { DrumSoundId } from '../instruments/drums/drumsSounds';
import {
  initGuitarEngine,
  playGuitarSoundId,
  releaseGuitarEngine,
  setGuitarVoice,
} from '../instruments/guitar/guitarEngine';
import { isGuitarVoiceId } from '../instruments/guitar/guitarVoices';
import {
  initPadsEngine,
  releasePadsEngine,
  triggerPadForBank,
} from '../instruments/pads/padsEngine';
import { isPadBankId, type PadBankId } from '../instruments/pads/padsBanks';
import type { PadSoundId } from '../instruments/pads/padsSounds';
import {
  initPianoEngine,
  playNote as playPianoNote,
  releasePianoEngine,
} from '../instruments/piano/pianoEngine';
import type { NoteId } from '../instruments/piano/pianoNotes';
import {
  initViolinEngine,
  playViolinSoundId,
  releaseViolinEngine,
  setViolinVoice,
  stopViolinPhrases,
} from '../instruments/violin/violinEngine';
import { isViolinVoiceId } from '../instruments/violin/violinVoices';
import type { InstrumentId, SavedRecording } from '../types/recording';

export type RecordingPlaybackHandle = {
  stop: () => void;
};

let activeMicPlayer: AudioPlayer | null = null;
let activeCancel: (() => void) | null = null;
let loadedInstrument: InstrumentId | null = null;

async function ensureInstrumentEngine(instrument: InstrumentId): Promise<void> {
  if (loadedInstrument && loadedInstrument !== instrument) {
    releaseInstrumentEngine(loadedInstrument);
    loadedInstrument = null;
  }

  switch (instrument) {
    case 'piano':
      await initPianoEngine();
      break;
    case 'drums':
      await initDrumsEngine();
      break;
    case 'guitar':
      await initGuitarEngine();
      break;
    case 'violin':
      await initViolinEngine();
      break;
    case 'pads':
      await initPadsEngine();
      break;
  }

  loadedInstrument = instrument;
}

function releaseInstrumentEngine(instrument: InstrumentId): void {
  switch (instrument) {
    case 'piano':
      releasePianoEngine();
      break;
    case 'drums':
      releaseDrumsEngine();
      break;
    case 'guitar':
      releaseGuitarEngine();
      break;
    case 'violin':
      releaseViolinEngine();
      break;
    case 'pads':
      releasePadsEngine();
      break;
  }
}

function playInstrumentEvent(
  instrument: InstrumentId,
  soundId: string,
  velocity?: number,
  padBankId: PadBankId = 'drums',
): void {
  switch (instrument) {
    case 'piano':
      playPianoNote(soundId as NoteId);
      return;
    case 'drums':
      playHit(soundId as DrumSoundId, velocity);
      return;
    case 'pads':
      triggerPadForBank(padBankId, soundId as PadSoundId, velocity ?? 1);
      return;
    case 'guitar': {
      playGuitarSoundId(soundId, velocity);
      return;
    }
    case 'violin': {
      playViolinSoundId(soundId);
      return;
    }
  }
}

function stopActivePlayback(): void {
  if (activeCancel) {
    activeCancel();
    activeCancel = null;
  }
  if (activeMicPlayer) {
    try {
      activeMicPlayer.pause();
      activeMicPlayer.remove();
    } catch {
      // Player may already be released.
    }
    activeMicPlayer = null;
  }
  // Phrase presets schedule their notes inside the violin engine — cancel
  // them too, or a stop mid-phrase keeps sounding the rest.
  stopViolinPhrases();
  stopAllVoices();
}

export function stopRecordingPlayback(): void {
  stopActivePlayback();
}

export function releaseRecordingPlaybackResources(): void {
  stopActivePlayback();
  if (loadedInstrument) {
    releaseInstrumentEngine(loadedInstrument);
    loadedInstrument = null;
  }
}

/**
 * Plays a saved recording. Stops any previous playback first.
 * Calls onEnded when the track finishes (or immediately if empty/invalid).
 */
export async function playSavedRecording(
  recording: SavedRecording,
  onEnded: () => void,
): Promise<RecordingPlaybackHandle> {
  stopActivePlayback();
  await restorePlaybackAudioMode();

  if (recording.mode === 'microphone') {
    const uri = recording.audioUri;
    if (!uri) {
      onEnded();
      return { stop: stopActivePlayback };
    }

    const player = createAudioPlayer({ uri });
    activeMicPlayer = player;

    const subscription = player.addListener('playbackStatusUpdate', (status) => {
      if (status.didJustFinish) {
        stopActivePlayback();
        onEnded();
      }
    });

    activeCancel = () => {
      subscription.remove();
    };

    void player.seekTo(0).then(() => {
      if (activeMicPlayer === player) {
        player.play();
      }
    });

    return {
      stop: () => {
        stopActivePlayback();
      },
    };
  }

  const events = recording.events ?? [];
  if (events.length === 0) {
    onEnded();
    return { stop: stopActivePlayback };
  }

  await ensureInstrumentEngine(recording.instrument);

  // Replay with the kit/voice the take was performed on — not whatever the
  // engine happens to be left on. Older takes without one default to the base.
  if (recording.instrument === 'drums') {
    setDrumKit(isDrumKitId(recording.drumKitId) ? recording.drumKitId : 'acoustic');
  }
  if (recording.instrument === 'guitar') {
    setGuitarVoice(
      isGuitarVoiceId(recording.guitarVoiceId) ? recording.guitarVoiceId : 'nylon',
    );
  }
  if (recording.instrument === 'violin') {
    setViolinVoice(
      isViolinVoiceId(recording.violinVoiceId) ? recording.violinVoiceId : 'classic',
    );
  }
  const padBankId: PadBankId = isPadBankId(recording.padBankId)
    ? recording.padBankId
    : 'drums';

  const timers: ReturnType<typeof setTimeout>[] = [];
  let finished = false;

  const finish = () => {
    if (finished) {
      return;
    }
    finished = true;
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.length = 0;
    stopViolinPhrases();
    stopAllVoices();
    activeCancel = null;
    onEnded();
  };

  for (const event of events) {
    if (event.atMs > recording.durationMs) {
      continue;
    }
    timers.push(
      setTimeout(() => {
        playInstrumentEvent(recording.instrument, event.soundId, event.velocity, padBankId);
      }, event.atMs),
    );
  }

  timers.push(setTimeout(finish, Math.max(recording.durationMs, 0) + 50));

  activeCancel = () => {
    finished = true;
    for (const timer of timers) {
      clearTimeout(timer);
    }
    timers.length = 0;
  };

  return {
    stop: () => {
      stopActivePlayback();
    },
  };
}
