import { PIANO_NOTES } from '../../pianoNotes';
import { greatFairyFountainSong } from '../greatFairyFountain';

const KEYS = new Set(PIANO_NOTES.map((note) => note.id));
const melody = greatFairyFountainSong.events.filter((e) => e.role !== 'accompaniment');
const bass = greatFairyFountainSong.events.filter((e) => e.role === 'accompaniment');

describe("Great Fairy's Fountain chart", () => {
  it('only uses keys the 24-key board has', () => {
    for (const event of greatFairyFountainSong.events) {
      expect(KEYS.has(event.noteId)).toBe(true);
    }
  });

  it('is in time order with finite, non-negative times', () => {
    const times = greatFairyFountainSong.events.map((e) => e.atMs);
    times.forEach((t, i) => {
      expect(Number.isFinite(t)).toBe(true);
      expect(t).toBeGreaterThanOrEqual(0);
      if (i > 0) {
        expect(t).toBeGreaterThanOrEqual(times[i - 1]);
      }
    });
  });

  it('gives the player one line, never two keys at once', () => {
    const times = melody.map((e) => e.atMs);
    expect(new Set(times).size).toBe(times.length);
  });

  it('keeps every melody gap at an eighth note or longer at 78 BPM', () => {
    for (let i = 1; i < melody.length; i += 1) {
      expect(melody[i].atMs - melody[i - 1].atMs).toBeGreaterThanOrEqual(385);
    }
  });

  it('sounds the bass an octave down, on every bar', () => {
    expect(bass.every((e) => e.transpose === -12)).toBe(true);
    const bars = new Set(bass.map((e) => Math.floor(e.atMs / (4 * 770))));
    expect(bars.size).toBe(16);
  });

  it('runs about three quarters of a minute', () => {
    const last = melody[melody.length - 1];
    expect(last.atMs).toBeGreaterThan(40_000);
    expect(last.atMs).toBeLessThan(55_000);
  });

  it('has an excerpt window inside the chart', () => {
    const window = greatFairyFountainSong.partialWindowMs!;
    expect(window.startMs).toBe(0);
    expect(window.endMs).toBeLessThan(melody[melody.length - 1].atMs);
  });
});
