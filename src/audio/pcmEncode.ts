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

/** Builds a canonical 16-bit PCM WAV file from decoded channel data. */
export function encodeWavPcm16(channels: Float32Array[], sampleRate: number): Uint8Array {
  const numChannels = channels.length;
  const numFrames = channels[0]?.length ?? 0;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numFrames * blockAlign;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  function writeString(offset: number, value: string) {
    for (let i = 0; i < value.length; i++) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  const int16Channels = channels.map(floatTo16BitPCM);
  let offset = 44;
  for (let frame = 0; frame < numFrames; frame++) {
    for (let ch = 0; ch < numChannels; ch++) {
      view.setInt16(offset, int16Channels[ch][frame], true);
      offset += 2;
    }
  }

  return new Uint8Array(buffer);
}

/** Encodes decoded channel data to MP3 (mono or stereo) via a pure-JS encoder — no native module. */
export function encodeMp3Pcm16(
  channels: Float32Array[],
  sampleRate: number,
  kbps = 128,
): Uint8Array {
  const numChannels = Math.min(2, channels.length) as 1 | 2;
  const encoder = new Mp3Encoder(numChannels, sampleRate, kbps);
  const left = floatTo16BitPCM(channels[0] ?? new Float32Array(0));
  const right = numChannels === 2 ? floatTo16BitPCM(channels[1]) : undefined;

  const chunks: Uint8Array[] = [];
  const totalFrames = left.length;
  for (let i = 0; i < totalFrames; i += MP3_BLOCK_SIZE) {
    const leftChunk = left.subarray(i, i + MP3_BLOCK_SIZE);
    const rightChunk = right?.subarray(i, i + MP3_BLOCK_SIZE);
    const encoded = encoder.encodeBuffer(leftChunk, rightChunk);
    if (encoded.length > 0) {
      chunks.push(encoded);
    }
  }
  const tail = encoder.flush();
  if (tail.length > 0) {
    chunks.push(tail);
  }

  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let writeOffset = 0;
  for (const chunk of chunks) {
    result.set(chunk, writeOffset);
    writeOffset += chunk.length;
  }
  return result;
}
