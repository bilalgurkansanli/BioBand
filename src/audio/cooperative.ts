// Long PCM loops (mixing, resampling, limiting, encoding) run in JavaScript on
// the same thread that draws the UI. Done in one go, a few minutes of audio
// freezes the app with no spinner and no way out. These helpers cut that work
// into slices with a yield to the event loop between them, and check the
// caller's cancel flag at every yield.

export class EncodeCanceledError extends Error {
  constructor(message = 'Encoding was canceled.') {
    super(message);
    this.name = 'EncodeCanceledError';
  }
}

export type CooperativeOptions = {
  /** Polled at every yield — return `true` to abort with `EncodeCanceledError`. */
  shouldCancel?: () => boolean;
};

/**
 * Samples handled between two yields. ~0.7 s of 48 kHz audio: a few
 * milliseconds of work per slice, so the UI keeps drawing and the yields
 * themselves cost nothing measurable.
 */
export const SAMPLES_PER_SLICE = 32768;

export function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/** Yield once and honour a cancel request. */
export async function checkpoint(options?: CooperativeOptions): Promise<void> {
  await yieldToEventLoop();
  if (options?.shouldCancel?.()) {
    throw new EncodeCanceledError();
  }
}

/**
 * Runs `work(start, end)` over [0, length) in slices, yielding (and checking
 * for cancellation) between them. Every index is covered exactly once, in
 * order.
 */
export async function processInSlices(
  length: number,
  work: (start: number, end: number) => void,
  options?: CooperativeOptions,
): Promise<void> {
  for (let start = 0; start < length; start += SAMPLES_PER_SLICE) {
    const end = Math.min(length, start + SAMPLES_PER_SLICE);
    work(start, end);
    if (end < length) {
      await checkpoint(options);
    }
  }
}
