import { parseUserDrumSongJson } from '../drums/songs/userDrumSongSchema';
import {
  buildUserGuitarSongDefinition,
  parseUserGuitarSongJson,
  UserGuitarSongParseError,
} from '../guitar/songs/userGuitarSongSchema';
import { parseUserPadSongJson } from '../pads/songs/userPadSongSchema';
import { parseUserSongJson } from '../piano/songs/userSongSchema';
import { parseUserViolinSongJson } from '../violin/songs/userViolinSongSchema';
import {
  cleanText,
  MAX_USER_NOTE_DURATION_MS,
  MAX_USER_SONG_AT_MS,
  MAX_USER_SONG_EVENTS,
  MAX_USER_SONG_TITLE_LENGTH,
  readAtMs,
  readDurationMs,
  readPartialCount,
} from './userSongDocument';

function codeOf(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? 'unexpected';
  }
}

const parsers: [string, (text: string) => unknown, Record<string, unknown>][] = [
  ['piano', parseUserSongJson, { noteId: 'C4' }],
  ['guitar', parseUserGuitarSongJson, { soundId: 's1:f0' }],
  ['violin', parseUserViolinSongJson, { soundId: 'v1:0' }],
  ['drums', parseUserDrumSongJson, { padId: 'kick' }],
  ['pads', parseUserPadSongJson, { padId: 'pad01' }],
];

describe('shared readers', () => {
  it('readAtMs accepts sane onsets and rejects the rest', () => {
    expect(readAtMs(1234.4)).toBe(1234);
    expect(readAtMs(0)).toBe(0);
    expect(readAtMs(-1)).toBeNull();
    expect(readAtMs(Number.POSITIVE_INFINITY)).toBeNull();
    expect(readAtMs(Number.NaN)).toBeNull();
    expect(readAtMs(MAX_USER_SONG_AT_MS + 1)).toBeNull();
    expect(readAtMs('100')).toBeNull();
  });

  it('readDurationMs drops unusable lengths and clamps huge ones', () => {
    expect(readDurationMs(250)).toBe(250);
    expect(readDurationMs(0)).toBeUndefined();
    expect(readDurationMs(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(readDurationMs(1e12)).toBe(MAX_USER_NOTE_DURATION_MS);
  });

  it('cleanText trims, collapses and bounds', () => {
    expect(cleanText('  a \n\t b  ')).toBe('a b');
    expect(cleanText('x'.repeat(500))).toHaveLength(MAX_USER_SONG_TITLE_LENGTH);
    expect(cleanText(42)).toBe('');
  });

  it('readPartialCount stays within the song', () => {
    expect(readPartialCount(5, 20, 12)).toBe(5);
    expect(readPartialCount(500, 20, 12)).toBe(20);
    expect(readPartialCount(0.2, 20, 12)).toBe(1);
    expect(readPartialCount(undefined, 8, 12)).toBe(8);
  });
});

describe.each(parsers)('%s JSON schema', (_name, parse, note) => {
  const doc = (events: unknown[], extra: Record<string, unknown> = {}) =>
    JSON.stringify({ title: 'T', ...extra, events });

  it('accepts a minimal document', () => {
    expect(codeOf(() => parse(doc([{ ...note, atMs: 0 }])))).toBeNull();
  });

  it('rejects onsets that overflowed, went negative or run past an hour', () => {
    expect(codeOf(() => parse(`{"events":[{"atMs":1e999,${JSON.stringify(note).slice(1)}]}`))).toBe(
      'invalidSchema',
    );
    expect(codeOf(() => parse(doc([{ ...note, atMs: -5 }])))).toBe('invalidSchema');
    expect(codeOf(() => parse(doc([{ ...note, atMs: MAX_USER_SONG_AT_MS + 1 }])))).toBe(
      'invalidSchema',
    );
  });

  it('rejects malformed documents with the shared codes', () => {
    expect(codeOf(() => parse('{'))).toBe('invalidJson');
    expect(codeOf(() => parse('[]'))).toBe('invalidSchema');
    expect(codeOf(() => parse(doc([])))).toBe('emptySong');
    expect(codeOf(() => parse(doc([null])))).toBe('invalidSchema');
    const tooMany = Array.from({ length: MAX_USER_SONG_EVENTS + 1 }, (_, i) => ({ ...note, atMs: i }));
    expect(codeOf(() => parse(doc(tooMany)))).toBe('tooManyNotes');
  });

  it('bounds the title', () => {
    const song = parse(doc([{ ...note, atMs: 0 }], { title: 'y'.repeat(1000) })) as { title: string };
    expect(song.title.length).toBeLessThanOrEqual(MAX_USER_SONG_TITLE_LENGTH);
  });
});

describe('sound ids are stored in the form a press produces', () => {
  it('guitar: open strings, clamped frets and recording-form chords', () => {
    const song = parseUserGuitarSongJson(
      JSON.stringify({
        events: [
          { soundId: 's1', atMs: 0 },
          { soundId: 's2:f99', atMs: 100 },
          { soundId: 'chord:Em:arpeggio:up:swipe', atMs: 200 },
          { stringId: 's3', fret: 4.4, atMs: 300 },
        ],
      }),
    );
    expect(song.events.map((event) => event.soundId)).toEqual([
      's1:f0',
      's2:f12',
      'chord:Em',
      's3:f4',
    ]);
  });

  it('violin: positions past the fingerboard', () => {
    const song = parseUserViolinSongJson(
      JSON.stringify({ events: [{ soundId: 'v1:42', atMs: 0 }, { stringId: 'v2', position: 1e300, atMs: 10 }] }),
    );
    expect(song.events.map((event) => event.soundId)).toEqual(['v1:9', 'v2:9']);
  });
});

describe('converter output gate', () => {
  it('rejects non-finite onsets and lengths handed to a builder', () => {
    expect(() =>
      buildUserGuitarSongDefinition({
        title: 'T',
        events: [{ soundId: 's1:f0', atMs: Number.NaN }],
      }),
    ).toThrow(UserGuitarSongParseError);
    expect(
      codeOf(() =>
        buildUserGuitarSongDefinition({
          title: 'T',
          events: [{ soundId: 's1:f0', atMs: 0, durationMs: Number.POSITIVE_INFINITY }],
        }),
      ),
    ).toBe('invalidSchema');
  });
});
