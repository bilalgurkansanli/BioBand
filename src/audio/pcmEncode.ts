import { Mp3Encoder } from '@breezystack/lamejs';

/** Samples per lamejs encode call — its own recommended block size. */
const MP3_BLOCK_SIZE = 1152;

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    const s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
  }
  return output;
}

export class EncodeCanceledError extends Error {
  constructor(message = 'Encoding was canceled.') {
    super(message);
    this.name = 'EncodeCanceledError';
  }
}

export type EncodeMp3Options = {
  kbps?: number;
  /** 0..1. Reported once per yield, so a few times a second. */
  onProgress?: (ratio: number) => void;
  /** Polled at every yield — return `true` to abort with `EncodeCanceledError`. */
  shouldCancel?: () => boolean;
};

/**
 * Blocks encoded between two yields back to the event loop.
 * 24 blocks is ~0.63 s of 44.1 kHz audio — short enough that the progress bar
 * and the cancel button stay responsive, long enough that the yields
 * themselves cost nothing measurable.
 */
const BLOCKS_PER_SLICE = 24;

function yieldToEventLoop(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

/**
 * True when the two channels carry the exact same samples.
 *
 * The offline bounce always renders two channels, but every instrument voice
 * is a mono source fanned out equally by the graph, so both sides are usually
 * bit-identical. Encoding one channel instead of two then costs about a third
 * less time for an identical-sounding file. (The file does not shrink — the
 * encoder is constant-bitrate, so it spends the same 128 kbps either way.)
 */
function channelsAreIdentical(left: Float32Array, right: Float32Array): boolean {
  if (left.length !== right.length) {
    return false;
  }
  for (let i = 0; i < left.length; i++) {
    if (left[i] !== right[i]) {
      return false;
    }
  }
  return true;
}

/**
 * Encodes decoded channel data to MP3 via a pure-JS encoder — no native module.
 *
 * The encode is sliced and awaited rather than run in one go. lamejs is plain
 * JavaScript on the same thread that draws the UI, so a one-shot encode of a
 * few minutes of audio freezes the app outright for as long as it runs, with
 * no spinner and no way out. Slicing it costs nothing and keeps the screen
 * alive, the progress honest, and the cancel button real.
 */
export async function encodeMp3Pcm16Async(
  channels: Float32Array[],
  sampleRate: number,
  options: EncodeMp3Options = {},
): Promise<Uint8Array> {
  const kbps = options.kbps ?? 128;
  const stereo =
    channels.length >= 2 && !channelsAreIdentical(channels[0], channels[1]);
  const source = stereo ? [channels[0], channels[1]] : [channels[0] ?? new Float32Array(0)];
  const numChannels = source.length as 1 | 2;

  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  const totalFrames = source[0].length;
  const chunks: Uint8Array[] = [];

  let blocksSinceYield = 0;
  for (let i = 0; i < totalFrames; i += MP3_BLOCK_SIZE) {
    // Converted a block at a time: a whole-file Int16 copy of both channels
    // would otherwise sit in memory beside the Float32 render for the entire
    // encode.
    const left = floatTo16BitPCM(source[0].subarray(i, i + MP3_BLOCK_SIZE));
    const right = stereo
      ? floatTo16BitPCM(source[1].subarray(i, i + MP3_BLOCK_SIZE))
      : undefined;

    const encoded = encoder.encodeBuffer(left, right);
    if (encoded.length > 0) {
      chunks.push(encoded);
    }

    if (++blocksSinceYield >= BLOCKS_PER_SLICE) {
      blocksSinceYield = 0;
      options.onProgress?.(Math.min(1, (i + MP3_BLOCK_SIZE) / totalFrames));
      await yieldToEventLoop();
      if (options.shouldCancel?.()) {
        throw new EncodeCanceledError();
      }
    }
  }

  const tail = encoder.flush();
  if (tail.length > 0) {
    chunks.push(tail);
  }
  options.onProgress?.(1);

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of chunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }
  return result;
}
