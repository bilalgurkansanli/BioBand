import { parseMidiToDrumSong } from '../drums/songs/midiToDrumSong';
import { UserDrumSongParseError } from '../drums/songs/userDrumSongSchema';
import { parseMidiToGuitarSong } from '../guitar/songs/midiToGuitarSong';
import { UserGuitarSongParseError } from '../guitar/songs/userGuitarSongSchema';
import { parseMidiToPadSong } from '../pads/songs/midiToPadSong';
import { UserPadSongParseError } from '../pads/songs/userPadSongSchema';
import { parseMidiToSong } from '../piano/songs/midiToSong';
import { UserSongParseError } from '../piano/songs/userSongSchema';
import { parseMidiToViolinSong } from '../violin/songs/midiToViolinSong';
import { UserViolinSongParseError } from '../violin/songs/userViolinSongSchema';
import { GM_DRUM_CHANNEL } from './midiReader';
import { buildMidi, noteRun, withTimeDivision, type TestEvent } from './midiTestFile';
import { MAX_USER_SONG_TITLE_LENGTH } from './userSongDocument';

const KICK = 36;
const SNARE = 38;
const HAT = 42;

/** A dense drum track on channel 10 — what used to win the "melody" vote. */
function drumTrack(): TestEvent[] {
  return [
    ...noteRun(GM_DRUM_CHANNEL, [HAT], 64, { stepTicks: 120 }),
    ...noteRun(GM_DRUM_CHANNEL, [KICK, SNARE], 16, { stepTicks: 480 }),
  ];
}

/** A plain C-major line on channel 1. */
const MELODY = [60, 62, 64, 65, 67, 69, 71, 72];
function melodyTrack(): TestEvent[] {
  return noteRun(0, MELODY, MELODY.length);
}

/** A bass line on channel 2, inside the GM percussion note range (35–59). */
function bassTrack(): TestEvent[] {
  return noteRun(1, [40, 43, 45, 47], 8);
}

function codeOf(run: () => unknown): string | null {
  try {
    run();
    return null;
  } catch (error) {
    return (error as { code?: string }).code ?? 'unexpected';
  }
}

describe('melodic converters ignore the drum channel', () => {
  const bytes = buildMidi([drumTrack(), melodyTrack()]);

  it('piano takes the tune, not the kit', () => {
    const song = parseMidiToSong(bytes, { fileName: 'demo.mid' });
    const melody = song.events.filter((event) => (event.role ?? 'melody') === 'melody');
    expect(melody.map((event) => event.noteId)).toEqual([
      'C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5',
    ]);
    expect(melody.map((event) => event.atMs)).toEqual([0, 500, 1000, 1500, 2000, 2500, 3000, 3500]);
  });

  it('guitar takes the tune, not the kit', () => {
    const song = parseMidiToGuitarSong(bytes);
    expect(song.events).toHaveLength(MELODY.length);
    for (const event of song.events) {
      expect(Number.isFinite(event.atMs)).toBe(true);
      expect(Number.isFinite(event.durationMs)).toBe(true);
    }
  });

  it('violin takes the tune, not the kit', () => {
    expect(parseMidiToViolinSong(bytes).events).toHaveLength(MELODY.length);
  });

  it('a drums-only file has nothing for a melodic instrument', () => {
    const drumsOnly = buildMidi([drumTrack()]);
    expect(codeOf(() => parseMidiToSong(drumsOnly))).toBe('emptySong');
    expect(codeOf(() => parseMidiToGuitarSong(drumsOnly))).toBe('emptySong');
    expect(codeOf(() => parseMidiToViolinSong(drumsOnly))).toBe('emptySong');
  });
});

describe('percussion converters read only the drum channel when there is one', () => {
  const bytes = buildMidi([drumTrack(), bassTrack(), melodyTrack()]);

  it('drums: the bass line no longer becomes kicks and toms', () => {
    const song = parseMidiToDrumSong(bytes);
    const pads = new Set(song.events.map((event) => event.padId));
    expect(pads).toEqual(new Set(['hihatClosed', 'kick', 'snare']));
    expect(song.events.some((event) => event.padId === 'tomLow')).toBe(false);
  });

  it('pads: same rule', () => {
    const song = parseMidiToPadSong(bytes);
    const pads = new Set(song.events.map((event) => event.padId));
    expect(pads).toEqual(new Set(['pad03', 'pad01', 'pad02']));
  });

  it('a file without a drum channel is still read as a drum part', () => {
    const offChannel = buildMidi([noteRun(0, [KICK, SNARE], 4)]);
    expect(parseMidiToDrumSong(offChannel).events.map((event) => event.padId)).toEqual([
      'kick', 'snare', 'kick', 'snare',
    ]);
    expect(parseMidiToPadSong(offChannel).events).toHaveLength(4);
  });
});

describe('broken headers and absurd files', () => {
  const zeroDivision = withTimeDivision(buildMidi([melodyTrack(), drumTrack()]), 0);

  it('a zero time division is a parse failure, never Infinity/NaN onsets', () => {
    expect(codeOf(() => parseMidiToSong(zeroDivision))).toBe('midiParseFailed');
    expect(codeOf(() => parseMidiToGuitarSong(zeroDivision))).toBe('midiParseFailed');
    expect(codeOf(() => parseMidiToViolinSong(zeroDivision))).toBe('midiParseFailed');
    expect(codeOf(() => parseMidiToDrumSong(zeroDivision))).toBe('midiParseFailed');
    expect(codeOf(() => parseMidiToPadSong(zeroDivision))).toBe('midiParseFailed');
  });

  it('keeps each converter on its own error class', () => {
    const garbage = Uint8Array.from([0, 1, 2]);
    expect(() => parseMidiToSong(garbage)).toThrow(UserSongParseError);
    expect(() => parseMidiToGuitarSong(garbage)).toThrow(UserGuitarSongParseError);
    expect(() => parseMidiToViolinSong(garbage)).toThrow(UserViolinSongParseError);
    expect(() => parseMidiToDrumSong(garbage)).toThrow(UserDrumSongParseError);
    expect(() => parseMidiToPadSong(garbage)).toThrow(UserPadSongParseError);
  });

  it('times SMPTE files in milliseconds and gives them no meter', () => {
    const song = parseMidiToSong(
      buildMidi([noteRun(0, [60, 64, 67], 3, { stepTicks: 1000 })], {
        framesPerSecond: 25,
        ticksPerFrame: 40,
      }),
    );
    expect(song.events.map((event) => event.atMs)).toEqual([0, 1000, 2000]);
    expect(song.meter).toBeUndefined();
  });

  it('drops notes a slow tempo map pushes past the longest allowed song', () => {
    // 16.7 s per beat: the second note lands well over an hour in.
    const bytes = buildMidi([
      [
        { tick: 0, type: 'tempo', microsecondsPerBeat: 16_777_215 },
        { tick: 0, type: 'note', channel: 0, noteNumber: 60, length: 10 },
        { tick: 480 * 300, type: 'note', channel: 0, noteNumber: 62, length: 10 },
      ],
    ]);
    const song = parseMidiToSong(bytes);
    expect(song.events).toHaveLength(1);
    expect(song.events[0].atMs).toBe(0);
  });

  it('bounds a free-text track name', () => {
    const bytes = buildMidi([[{ tick: 0, type: 'name', text: 'x'.repeat(5000) }, ...melodyTrack()]]);
    for (const title of [
      parseMidiToSong(bytes).title,
      parseMidiToGuitarSong(bytes).title,
      parseMidiToViolinSong(bytes).title,
    ]) {
      expect(title.length).toBeLessThanOrEqual(MAX_USER_SONG_TITLE_LENGTH);
    }
  });

  it('falls back to the file name for the title', () => {
    expect(parseMidiToSong(buildMidi([melodyTrack()]), { fileName: 'Tune.MID' }).title).toBe('Tune');
  });
});
