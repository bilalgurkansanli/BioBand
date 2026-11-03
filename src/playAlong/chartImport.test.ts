import { MAX_USER_SONG_FILE_BYTES } from '../instruments/shared/userSongDocument';
import { UserGuitarSongParseError } from '../instruments/guitar/songs/userGuitarSongSchema';
import {
  detectChartSource,
  parseChartFile,
  parseChartText,
  type ChartFile,
  type ChartParsers,
} from './chartImport';

type Def = { title: string };

const parsers: ChartParsers<Def, 'invalidJson' | 'emptySong'> = {
  parseJson: (text, options) => {
    const doc = JSON.parse(text) as { title?: string; empty?: boolean };
    if (doc.empty) {
      throw new UserGuitarSongParseError('emptySong');
    }
    return { title: doc.title ?? options?.fallbackTitle ?? 'Untitled' };
  },
  parseMidi: (bytes, options) => ({ title: `${options?.fileName}:${bytes.length}` }),
  errorCode: (error) =>
    error instanceof UserGuitarSongParseError && error.code === 'emptySong' ? 'emptySong' : null,
};

function fakeFile(content: string | Uint8Array, size?: number): ChartFile & { reads: number } {
  const file = {
    reads: 0,
    size: size ?? (typeof content === 'string' ? content.length : content.length),
    text: async () => {
      file.reads += 1;
      return typeof content === 'string' ? content : '';
    },
    bytes: async () => {
      file.reads += 1;
      return typeof content === 'string' ? new Uint8Array() : content;
    },
  };
  return file;
}

describe('detectChartSource', () => {
  it('goes by extension, then MIME type', () => {
    expect(detectChartSource('song.JSON')).toBe('json');
    expect(detectChartSource('song.mid')).toBe('midi');
    expect(detectChartSource('song.midi')).toBe('midi');
    expect(detectChartSource('download', 'audio/x-midi')).toBe('midi');
    expect(detectChartSource('song.mp3', 'audio/mpeg')).toBeNull();
  });
});

describe('parseChartFile', () => {
  it('parses JSON with the file name as fallback title', async () => {
    const result = await parseChartFile(fakeFile('{}'), 'My Tune.json', null, parsers);
    expect(result).toEqual({ ok: true, source: 'json', definition: { title: 'My Tune' } });
  });

  it('parses MIDI bytes', async () => {
    const result = await parseChartFile(fakeFile(Uint8Array.from([1, 2, 3])), 'a.mid', null, parsers);
    expect(result).toEqual({ ok: true, source: 'midi', definition: { title: 'a.mid:3' } });
  });

  it('refuses a file over the cap without reading it', async () => {
    const file = fakeFile('{}', MAX_USER_SONG_FILE_BYTES + 1);
    expect(await parseChartFile(file, 'huge.json', null, parsers)).toEqual({
      ok: false,
      code: 'fileTooLarge',
    });
    expect(file.reads).toBe(0);
  });

  it('still refuses an oversized file whose provider reported no size', async () => {
    const big = new Uint8Array(MAX_USER_SONG_FILE_BYTES + 1);
    expect(await parseChartFile(fakeFile(big, 0), 'huge.mid', null, parsers)).toEqual({
      ok: false,
      code: 'fileTooLarge',
    });
  });

  it('reports unsupported files, parser codes and read failures', async () => {
    expect(await parseChartFile(fakeFile('x'), 'a.txt', 'text/plain', parsers)).toEqual({
      ok: false,
      code: 'unsupported',
    });
    expect(await parseChartFile(fakeFile('{"empty":true}'), 'a.json', null, parsers)).toEqual({
      ok: false,
      code: 'emptySong',
    });
    const broken: ChartFile = {
      size: 10,
      text: () => Promise.reject(new Error('io')),
      bytes: () => Promise.reject(new Error('io')),
    };
    expect(await parseChartFile(broken, 'a.json', null, parsers)).toEqual({
      ok: false,
      code: 'readFailed',
    });
  });
});

describe('parseChartText', () => {
  it('parses pasted JSON and caps its length', () => {
    expect(parseChartText('{"title":"T"}', parsers)).toEqual({
      ok: true,
      source: 'json',
      definition: { title: 'T' },
    });
    expect(parseChartText('x'.repeat(MAX_USER_SONG_FILE_BYTES + 1), parsers)).toEqual({
      ok: false,
      code: 'fileTooLarge',
    });
    expect(parseChartText('{', parsers)).toEqual({ ok: false, code: 'invalidJson' });
  });
});
