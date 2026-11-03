import {
  fitMidiToKeyboard,
  parsePitchToMidi,
  parseUserSongJson,
  UserSongParseError,
} from './userSongSchema';

function parseError(text: string): string | null {
  try {
    parseUserSongJson(text);
    return null;
  } catch (error) {
    return error instanceof UserSongParseError ? error.code : 'unexpected';
  }
}

describe('parsePitchToMidi', () => {
  it('reads pitch names across the MIDI range', () => {
    expect(parsePitchToMidi('C4')).toBe(60);
    expect(parsePitchToMidi('Bb3')).toBe(58);
    expect(parsePitchToMidi('C-1')).toBe(0);
    expect(parsePitchToMidi('G9')).toBe(127);
    expect(parsePitchToMidi(' A5 ')).toBe(81);
  });

  it('rejects octaves outside -1..9 instead of producing huge numbers', () => {
    expect(parsePitchToMidi('C99999999999999999999')).toBeNull();
    expect(parsePitchToMidi('C10')).toBeNull();
    expect(parsePitchToMidi('C-2')).toBeNull();
    expect(parsePitchToMidi('C1e5')).toBeNull();
    expect(parsePitchToMidi('H4')).toBeNull();
    expect(parsePitchToMidi(60)).toBeNull();
  });
});

describe('fitMidiToKeyboard', () => {
  it('folds out-of-range pitches by octaves', () => {
    expect(fitMidiToKeyboard(60)).toBe('C4');
    expect(fitMidiToKeyboard(48)).toBe('C4');
    expect(fitMidiToKeyboard(95)).toBe('B5');
    expect(fitMidiToKeyboard(84)).toBe('C5');
  });

  it('returns immediately for absurd and non-finite input', () => {
    expect(fitMidiToKeyboard(1.2e21)).toMatch(/^[A-G]b?[45]$/);
    expect(fitMidiToKeyboard(-1.2e21)).toMatch(/^[A-G]b?[45]$/);
    expect(fitMidiToKeyboard(Number.NaN)).toBe('C4');
    expect(fitMidiToKeyboard(Number.POSITIVE_INFINITY)).toBe('C4');
  });
});

describe('parseUserSongJson', () => {
  it('rejects a note with an unbounded octave (used to freeze the app)', () => {
    const text = JSON.stringify({
      title: 'Bad',
      events: [{ noteId: 'C99999999999999999999', atMs: 0 }],
    });
    expect(parseError(text)).toBe('invalidNote');
  });

  it('still shifts an out-of-range tune onto the keyboard as one piece', () => {
    const song = parseUserSongJson(
      JSON.stringify({
        title: 'Low',
        events: [
          { noteId: 'C3', atMs: 0 },
          { noteId: 'B3', atMs: 500 },
          { noteId: 'D4', atMs: 1000 },
        ],
      }),
    );
    expect(song.events.map((event) => event.noteId)).toEqual(['C4', 'B4', 'D5']);
  });

  it('rejects an atMs that overflowed to Infinity', () => {
    expect(parseError('{"events":[{"noteId":"C4","atMs":1e999}]}')).toBe('invalidSchema');
  });
});
