import { MAX_USER_SONG_FILE_BYTES } from '../instruments/shared/userSongDocument';

// The import pipeline every instrument's song library runs: decide what kind
// of file was picked, refuse one too large to be a chart, read it, hand it to
// the instrument's parser and turn whatever goes wrong into an error code the
// import UI already knows how to show. It was copied into five hooks.

export type ChartSource = 'json' | 'midi';

/** Failures that come from the pipeline rather than from a parser. */
export type ChartPipelineCode = 'unsupported' | 'readFailed' | 'invalidJson' | 'fileTooLarge';

export type ChartParsers<TDef, TCode extends string> = {
  parseJson: (text: string, options?: { fallbackTitle?: string }) => TDef;
  parseMidi: (bytes: ArrayLike<number>, options?: { fileName?: string }) => TDef;
  /** The code carried by this instrument's own parse error, or null for anything else. */
  errorCode: (error: unknown) => TCode | null;
};

/** The parts of an expo-file-system `File` the pipeline reads. */
export type ChartFile = {
  /** Bytes on disk; 0 when unknown or unreadable. */
  readonly size: number;
  text(): Promise<string>;
  bytes(): Promise<Uint8Array>;
};

export type ChartParseResult<TDef, TCode extends string> =
  | { ok: true; definition: TDef; source: ChartSource }
  | { ok: false; code: TCode | ChartPipelineCode };

function extensionOf(name: string): string {
  const match = name.match(/\.([a-zA-Z0-9]+)$/);
  return match?.[1]?.toLowerCase() ?? '';
}

export function detectChartSource(fileName: string, mimeType?: string | null): ChartSource | null {
  const ext = extensionOf(fileName);
  if (ext === 'json' || mimeType === 'application/json') {
    return 'json';
  }
  if (
    ext === 'mid' ||
    ext === 'midi' ||
    mimeType === 'audio/midi' ||
    mimeType === 'audio/mid' ||
    mimeType === 'audio/x-midi'
  ) {
    return 'midi';
  }
  return null;
}

/**
 * Read and parse a picked chart file.
 *
 * The size is checked before anything is read: `text()` / `bytes()` pull the
 * whole file into memory on the JS thread, and the picker will hand over
 * anything a provider labels as MIDI or JSON. The length is checked again
 * after reading, for providers that report no size.
 */
export async function parseChartFile<TDef, TCode extends string>(
  file: ChartFile,
  fileName: string,
  mimeType: string | null | undefined,
  parsers: ChartParsers<TDef, TCode>,
): Promise<ChartParseResult<TDef, TCode>> {
  const source = detectChartSource(fileName, mimeType);
  if (!source) {
    return { ok: false, code: 'unsupported' };
  }
  if (file.size > MAX_USER_SONG_FILE_BYTES) {
    return { ok: false, code: 'fileTooLarge' };
  }

  try {
    if (source === 'json') {
      const text = await file.text();
      if (text.length > MAX_USER_SONG_FILE_BYTES) {
        return { ok: false, code: 'fileTooLarge' };
      }
      const definition = parsers.parseJson(text, {
        fallbackTitle: fileName.replace(/\.json$/i, ''),
      });
      return { ok: true, definition, source };
    }
    const bytes = await file.bytes();
    if (bytes.length > MAX_USER_SONG_FILE_BYTES) {
      return { ok: false, code: 'fileTooLarge' };
    }
    const definition = parsers.parseMidi(bytes, { fileName });
    return { ok: true, definition, source };
  } catch (error) {
    return { ok: false, code: parsers.errorCode(error) ?? 'readFailed' };
  }
}

/** Parse JSON typed or pasted into the import box. */
export function parseChartText<TDef, TCode extends string>(
  text: string,
  parsers: ChartParsers<TDef, TCode>,
): ChartParseResult<TDef, TCode> {
  if (text.length > MAX_USER_SONG_FILE_BYTES) {
    return { ok: false, code: 'fileTooLarge' };
  }
  try {
    return { ok: true, definition: parsers.parseJson(text), source: 'json' };
  } catch (error) {
    return { ok: false, code: parsers.errorCode(error) ?? 'invalidJson' };
  }
}
