import {
  initDrumsEngine,
  releaseDrumsEngine,
} from '../instruments/drums/drumsEngine';
import {
  initGuitarEngine,
  releaseGuitarEngine,
} from '../instruments/guitar/guitarEngine';
import { initPadsEngine, releasePadsEngine } from '../instruments/pads/padsEngine';
import { initPianoEngine, releasePianoEngine } from '../instruments/piano/pianoEngine';
import {
  initViolinEngine,
  releaseViolinEngine,
} from '../instruments/violin/violinEngine';
import type { InstrumentId } from '../types/recording';

// Every instrument engine is a process-wide singleton, but several owners want
// one at the same time: a Studio mix, a saved-take player, the drum machine and
// whichever instrument screen is focused. When each of them called
// releaseXEngine() on its own cleanup, the last one to leave tore the engine
// down under everybody still using it — the classic symptom was a Studio mix
// going silent on the piano track after a round trip to the Piano screen.
//
// So ownership is counted here instead: the engine comes up on the first
// acquire and only goes away when the last owner has let go.

type EngineEntry = {
  init: () => Promise<void>;
  release: () => void;
  /** How many owners currently need this engine. */
  count: number;
  /** In-flight init, shared so parallel acquires never build the graph twice. */
  loading: Promise<void> | null;
  /** True between a resolved init and its teardown. */
  loaded: boolean;
};

const ENGINES: Record<InstrumentId, EngineEntry> = {
  drums: {
    init: initDrumsEngine,
    release: releaseDrumsEngine,
    count: 0,
    loading: null,
    loaded: false,
  },
  guitar: {
    init: initGuitarEngine,
    release: releaseGuitarEngine,
    count: 0,
    loading: null,
    loaded: false,
  },
  pads: {
    init: initPadsEngine,
    release: releasePadsEngine,
    count: 0,
    loading: null,
    loaded: false,
  },
  piano: {
    init: initPianoEngine,
    release: releasePianoEngine,
    count: 0,
    loading: null,
    loaded: false,
  },
  violin: {
    init: initViolinEngine,
    release: releaseViolinEngine,
    count: 0,
    loading: null,
    loaded: false,
  },
};

const ENGINE_IDS = Object.keys(ENGINES) as InstrumentId[];

/**
 * Take a reference on an instrument engine, loading it if nobody had it yet.
 * Resolves once the engine is playable. Every acquire — including one whose
 * init rejects — must be balanced by exactly one releaseEngine call.
 */
export async function acquireEngine(instrument: InstrumentId): Promise<void> {
  const entry = ENGINES[instrument];
  entry.count += 1;

  if (entry.loading) {
    await entry.loading;
  } else if (!entry.loaded) {
    const loading = entry.init();
    entry.loading = loading;
    try {
      await loading;
      entry.loaded = true;
    } finally {
      // A hard teardown mid-load already dropped this promise; leave whatever
      // it put there instead of clearing a newer owner's init.
      if (entry.loading === loading) {
        entry.loading = null;
      }
    }
  }

  // Every owner let go while the samples were still decoding, so the teardown
  // was deferred to here — the engine must not outlive them. `loaded` gates it
  // because every caller awaiting one shared init runs this same tail: without
  // it, two owners letting go mid-load would release the engine twice.
  if (entry.count === 0 && entry.loaded) {
    entry.loaded = false;
    entry.release();
  }
}

/** Give up one reference; the engine is torn down when the last one goes. */
export function releaseEngine(instrument: InstrumentId): void {
  const entry = ENGINES[instrument];
  if (entry.count === 0) {
    // Unbalanced release (a double cleanup, say). Going negative here would
    // make the next owner's acquire skip the init it needs.
    return;
  }

  entry.count -= 1;
  if (entry.count > 0) {
    return;
  }
  if (entry.loading) {
    // Half-built graph: acquireEngine finishes the job and tears it down once
    // its init settles.
    return;
  }

  entry.loaded = false;
  entry.release();
}

/** Hard teardown for app-level cleanup: drops every reference and engine. */
export function releaseAllEngines(): void {
  for (const instrument of ENGINE_IDS) {
    const entry = ENGINES[instrument];
    const wasLoaded = entry.loaded;
    entry.count = 0;
    entry.loading = null;
    entry.loaded = false;
    if (wasLoaded) {
      entry.release();
    }
  }
}
