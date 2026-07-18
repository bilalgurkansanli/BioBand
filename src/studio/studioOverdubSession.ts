import type { InstrumentId, RecordingMode } from '../types/recording';

export type StudioOverdubSession = {
  projectId: string;
  projectTitle: string;
  instrument: InstrumentId;
  mode: RecordingMode;
  active: boolean;
};

type Listener = (session: StudioOverdubSession | null) => void;

let current: StudioOverdubSession | null = null;
const listeners = new Set<Listener>();

function emit(): void {
  for (const listener of listeners) {
    listener(current);
  }
}

export function getStudioOverdubSession(): StudioOverdubSession | null {
  return current;
}

export function startStudioOverdubSession(input: {
  projectId: string;
  projectTitle: string;
  instrument: InstrumentId;
  mode: RecordingMode;
}): void {
  current = {
    projectId: input.projectId,
    projectTitle: input.projectTitle,
    instrument: input.instrument,
    mode: input.mode,
    active: true,
  };
  emit();
}

export function clearStudioOverdubSession(): void {
  if (!current) {
    return;
  }
  current = null;
  emit();
}

export function subscribeStudioOverdubSession(listener: Listener): () => void {
  listeners.add(listener);
  listener(current);
  return () => {
    listeners.delete(listener);
  };
}

export function instrumentRouteFor(
  instrument: InstrumentId,
): 'Piano' | 'Drums' | 'Guitar' | 'Violin' | 'Pads' {
  switch (instrument) {
    case 'piano':
      return 'Piano';
    case 'drums':
      return 'Drums';
    case 'guitar':
      return 'Guitar';
    case 'violin':
      return 'Violin';
    case 'pads':
      return 'Pads';
  }
}
