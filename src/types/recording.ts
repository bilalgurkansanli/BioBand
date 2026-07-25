import type { NoteId } from '../instruments/piano/pianoNotes';

export type InstrumentId = 'piano' | 'drums' | 'guitar' | 'violin' | 'pads';

export type RecordingMode = 'instrument' | 'microphone';

// A single triggered sound within an instrument track (note, drum hit, pad, etc.).
// `soundId` is instrument-specific (e.g. a piano NoteId or a drum pad id).
export type InstrumentEvent = {
  soundId: string;
  atMs: number;
  /** 0..1 hit strength (drums velocity) — absent means full strength. */
  velocity?: number;
};

export type RecordingSource = 'instrument' | 'drumMachine' | 'imported';

export type SavedRecording = {
  id: string;
  createdAt: number;
  instrument: InstrumentId;
  mode: RecordingMode;
  durationMs: number;
  events?: InstrumentEvent[];
  audioUri?: string;
  /** Optional display name (e.g. drum-machine pattern title). */
  title?: string;
  /** Origin of the take — drum machine patterns also appear in Kayıtlarım. */
  source?: RecordingSource;
  /** Drum kit the take was performed with — playback restores this timbre. */
  drumKitId?: string;
  /** Guitar voice the take was performed with — playback restores this timbre. */
  guitarVoiceId?: string;
  /** Violin voice the take was performed with — playback restores this timbre. */
  violinVoiceId?: string;
  /** Pad bank the take was performed with — playback restores this timbre. */
  padBankId?: string;
  /** Piano voice the take was performed with — playback restores this timbre. */
  pianoVoiceId?: string;
};

// Piano note ids are the canonical sound ids for the piano track.
export type { NoteId };
