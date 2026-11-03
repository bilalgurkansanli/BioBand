import { resolvePianoDryEvents } from '../dryBounce/pianoDryEvents';
import { getNoteSampleConfig } from '../../instruments/piano/pianoSamples';

// jest.mock is hoisted above the import: the decode is the only native call.
jest.mock('../sampleBank', () => ({
  loadSample: jest.fn(async () => ({ sampleRate: 48000, duration: 10 })),
}));

const semitonesOf = (rate: number | undefined) => 12 * Math.log2(rate ?? 1);

describe('resolvePianoDryEvents', () => {
  it('exports a take at the pitch it was played, tone slider included', async () => {
    // C4 is itself an anchor, so an untransposed C4 plays its sample as-is.
    const plain = await resolvePianoDryEvents([{ soundId: 'C4', atMs: 0 }], 'acoustic');
    // Two up from C4 is D4 (MIDI 62), which the sampler reaches from its
    // nearest anchor — exactly what the live keyboard does for that pitch.
    const shifted = await resolvePianoDryEvents(
      [{ soundId: 'C4', atMs: 0, transposeSemitones: 2 }],
      'acoustic',
    );

    expect(semitonesOf(plain.sampleEvents[0].playbackRate)).toBeCloseTo(0, 6);
    expect(shifted.sampleEvents[0].playbackRate).toBeCloseTo(
      getNoteSampleConfig(62).playbackRate,
      9,
    );
    expect(shifted.sampleEvents[0].playbackRate).not.toBeCloseTo(1, 3);
  });

  it('plays older takes (no voice, no transposition) on the untransposed acoustic piano', async () => {
    const result = await resolvePianoDryEvents([{ soundId: 'C4', atMs: 0 }]);
    expect(result.sampleEvents).toHaveLength(1);
    expect(result.oscillatorEvents).toHaveLength(0);
    expect(result.sampleEvents[0].gain).toBe(0.55);
  });

  it('falls back to acoustic for an unknown voice instead of exporting silence', async () => {
    const result = await resolvePianoDryEvents([{ soundId: 'C4', atMs: 0 }], 'harpsichord');
    expect(result.sampleEvents).toHaveLength(1);
  });

  it('renders synth voices at the transposed frequency', async () => {
    const result = await resolvePianoDryEvents(
      [{ soundId: 'A4', atMs: 0, transposeSemitones: -12 }],
      'organ',
    );
    expect(result.oscillatorEvents[0].frequency).toBeCloseTo(220, 6);
  });
});
