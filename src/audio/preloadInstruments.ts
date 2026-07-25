import { initDrumsEngine } from '../instruments/drums/drumsEngine';
import { initGuitarEngine } from '../instruments/guitar/guitarEngine';
import { initPadsEngine } from '../instruments/pads/padsEngine';
import { initPianoEngine } from '../instruments/piano/pianoEngine';
import { initViolinEngine } from '../instruments/violin/violinEngine';

// Each instrument used to decode its own samples the moment its screen came
// into focus — eighty-odd files across the five of them. That is why tapping an
// instrument straight after opening the app stalled, and why the first notes
// were silent: the buffers simply were not there yet.
//
// Doing it up front instead, while the user is still looking at the launch
// screen, means every instrument is ready the moment it is opened. The decoded
// buffers are cached by asset in the sample bank and never evicted, so leaving
// and re-entering an instrument costs nothing after this.

export type InstrumentPreloadProgress = {
  loaded: number;
  total: number;
};

/**
 * Ordered by how soon a first-time user is likely to reach each one, so if the
 * screen is dismissed early the most-used instruments are already warm.
 */
const STEPS: { name: string; init: () => Promise<void> }[] = [
  { name: 'piano', init: initPianoEngine },
  { name: 'guitar', init: initGuitarEngine },
  { name: 'drums', init: initDrumsEngine },
  { name: 'violin', init: initViolinEngine },
  { name: 'pads', init: initPadsEngine },
];

export const INSTRUMENT_PRELOAD_STEPS = STEPS.length;

/**
 * Warm every instrument engine, one at a time.
 *
 * Sequential on purpose: each engine already decodes its own files in
 * parallel, and running all five at once would spike memory and flood the
 * audio thread on a low-end phone for no gain. One failing instrument is
 * logged and skipped — a missing sample must not keep the whole app on the
 * launch screen.
 */
export async function preloadInstruments(
  onProgress?: (progress: InstrumentPreloadProgress) => void,
): Promise<void> {
  const total = STEPS.length;
  let loaded = 0;
  onProgress?.({ loaded, total });

  for (const step of STEPS) {
    try {
      await step.init();
    } catch (error) {
      console.warn(`Preload: ${step.name} engine failed to warm up`, error);
    }
    loaded += 1;
    onProgress?.({ loaded, total });
  }
}
