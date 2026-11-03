import { HIT_WINDOW_BAND_MS } from '../../shared/playAlongScoring';
import { PIANO_SONGS } from './catalog';
import { PARTIAL_TAIL_MS } from '../../shared/countedSession';
import { resolvePlaySession } from './resolvePlaySession';
import type { SongDefinition, SongEvent } from './types';

function withBacking(song: SongDefinition, eventsStartMs: number): SongDefinition {
  return { ...song, backingTrack: { uri: 'file:///mix.mp3', eventsStartMs } };
}

const notesOf = (events: SongEvent[]) => events.map((event) => `${event.noteId}@${event.atMs}`);

const SONG: SongDefinition = {
  id: 'test',
  title: 'Test',
  previewDurationMs: 1000,
  events: [
    { noteId: 'C4', atMs: 0 },
    { noteId: 'D4', atMs: 1000 },
    { noteId: 'E4', atMs: 2000 },
    { noteId: 'C4', atMs: 2000, role: 'accompaniment', transpose: -12 },
    { noteId: 'F4', atMs: 3000 },
    { noteId: 'G4', atMs: 4000 },
  ],
  // Chart time: the excerpt is the 2nd–4th melody notes.
  partialWindowMs: { startMs: 1000, endMs: 3000 },
};

describe('partial scope', () => {
  it('without backing, the excerpt is the same whatever the calibration', () => {
    const plain = resolvePlaySession(SONG, 'piano', 'partial');
    // A saved band binding merges into the song even when playing piano-only.
    const calibrated = resolvePlaySession(withBacking(SONG, 7300), 'piano', 'partial');
    expect(notesOf(plain.events)).toEqual(['D4@0', 'E4@1000', 'F4@2000']);
    expect(notesOf(calibrated.events)).toEqual(notesOf(plain.events));
    expect(calibrated.useBacking).toBe(false);
  });

  it('with backing, the window moves with the calibration and plays on after the last note', () => {
    const session = resolvePlaySession(withBacking(SONG, 7300), 'fullBand', 'partial');
    expect(session.useBacking).toBe(true);
    expect(session.audioStartMs).toBe(7300 + 1000);
    expect(session.audioEndMs).toBe(7300 + 3000 + PARTIAL_TAIL_MS);
    expect(notesOf(session.events)).toEqual(['D4@0', 'E4@1000', 'F4@2000']);
  });

  it('a calibration before the file start drops only what has no audio', () => {
    const session = resolvePlaySession(withBacking(SONG, -1500), 'fullBand', 'partial');
    expect(session.audioStartMs).toBe(0);
    // D4 would sound at -500 ms in the file — before it begins.
    expect(notesOf(session.events)).toEqual(['E4@500', 'F4@1500']);
  });

  it('falls back to the opening when the named window has no melody', () => {
    const song = { ...SONG, partialWindowMs: { startMs: 50_000, endMs: 60_000 } };
    expect(resolvePlaySession(song, 'piano', 'partial').events).toHaveLength(5);
  });
});

describe('full scope', () => {
  it('without backing plays the melody as written', () => {
    const session = resolvePlaySession(withBacking(SONG, 4000), 'piano', 'full');
    expect(notesOf(session.events)).toEqual(['C4@0', 'D4@1000', 'E4@2000', 'F4@3000', 'G4@4000']);
    expect(session.audioEndMs).toBeNull();
  });

  it('with backing places notes at their audio position', () => {
    const session = resolvePlaySession(withBacking(SONG, 4000), 'fullBand', 'full');
    expect(session.audioStartMs).toBe(0);
    expect(session.events[0].atMs).toBe(4000);
  });
});

describe('every catalog excerpt', () => {
  const withWindows = PIANO_SONGS.filter((song) => song.partialWindowMs);

  it('has catalog songs that name an excerpt', () => {
    expect(withWindows.length).toBeGreaterThan(5);
  });

  it.each(withWindows.map((song) => [song.id, song] as const))(
    '%s: same section before and after calibration, last note scoreable',
    (_id, song) => {
      const plain = resolvePlaySession(song, 'piano', 'partial');
      const band = resolvePlaySession(withBacking(song, 2500), 'fullBand', 'partial');
      expect(plain.events.length).toBeGreaterThan(0);
      expect(notesOf(band.events)).toEqual(notesOf(plain.events));
      expect(band.audioStartMs).toBe(2500 + song.partialWindowMs!.startMs);

      const last = band.events[band.events.length - 1];
      const audioLength = band.audioEndMs! - band.audioStartMs;
      // The final note's whole hit window fits before the track stops.
      expect(last.atMs + HIT_WINDOW_BAND_MS).toBeLessThan(audioLength);
    },
  );
});

describe('band excerpt calibrated before the file starts', () => {
  it('falls back to the excerpt on its own instead of an empty lesson', () => {
    const band = resolvePlaySession(withBacking(SONG, -10_000), 'fullBand', 'partial');
    const plain = resolvePlaySession(SONG, 'piano', 'partial');
    expect(band.useBacking).toBe(false);
    expect(notesOf(band.events)).toEqual(notesOf(plain.events));
    expect(band.events.length).toBeGreaterThan(0);
  });
});
