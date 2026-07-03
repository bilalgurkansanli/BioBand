import type { NoteId } from '../instruments/piano/pianoNotes';

export type InstrumentId = 'piano' | 'drums' | 'guitar' | 'violin' | 'pads';

export type RecordingMode = 'instrument' | 'microphone';

// A single triggered sound within an instrument track (note, drum hit, pad, etc.).
// `soundId` is instrument-specific (e.g. a piano NoteId or a drum pad id).
export type InstrumentEvent = {
  soundId: string;
  atMs: number;
};

export type SavedRecording = {
  id: string;
  createdAt: number;
  instrument: InstrumentId;
  mode: RecordingMode;
  durationMs: number;
  events?: InstrumentEvent[];
  audioUri?: string;
};

// Piano note ids are the canonical sound ids for the piano track.
export type { NoteId };
