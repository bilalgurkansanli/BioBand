import { useCallback, useEffect, useState } from 'react';
import { File } from 'expo-file-system';

import { pickChartDocument } from '../utils/documentPicker';
import {
  parseChartFile,
  parseChartText,
  type ChartParsers,
  type ChartPipelineCode,
  type ChartSource,
} from './chartImport';

/** Everything the library needs to know about one instrument's songs. */
export type UserSongLibraryAdapter<TSong, TDef, TCode extends string> = ChartParsers<
  TDef,
  TCode
> & {
  load: () => Promise<TSong[]>;
  /** Saves (replacing any song with the same id) and returns the new list. */
  save: (song: TSong) => Promise<TSong[]>;
  remove: (songId: string) => Promise<TSong[]>;
  /** The stored form: the definition plus where it came from and when. */
  stamp: (definition: TDef, source: ChartSource, importedAt: number) => TSong;
};

export type ImportUserSongResult<TSong, TCode extends string> =
  | { ok: true; song: TSong }
  | { ok: false; code: TCode | ChartPipelineCode | 'canceled' | 'pickerUnavailable' };

/**
 * The imported-songs library of one instrument: loading it, importing from a
 * picked file or pasted JSON, and removing. The adapter must be a stable
 * (module-level) object.
 */
export function useUserSongLibrary<TSong, TDef, TCode extends string>(
  adapter: UserSongLibraryAdapter<TSong, TDef, TCode>,
) {
  const [songs, setSongs] = useState<TSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const loaded = await adapter.load();
      if (!cancelled) {
        setSongs(loaded);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [adapter]);

  const persist = useCallback(
    async (definition: TDef, source: ChartSource): Promise<TSong> => {
      const song = adapter.stamp(definition, source, Date.now());
      setSongs(await adapter.save(song));
      return song;
    },
    [adapter],
  );

  /** Import chart only (JSON/MIDI). */
  const importSong = useCallback(async (): Promise<ImportUserSongResult<TSong, TCode>> => {
    setImporting(true);
    try {
      const picked = await pickChartDocument();
      if (!picked.ok) {
        return { ok: false, code: picked.code };
      }
      const { asset } = picked;
      const parsed = await parseChartFile(
        new File(asset.uri),
        asset.name,
        asset.mimeType,
        adapter,
      );
      if (!parsed.ok) {
        return parsed;
      }
      return { ok: true, song: await persist(parsed.definition, parsed.source) };
    } catch {
      return { ok: false, code: 'readFailed' };
    } finally {
      setImporting(false);
    }
  }, [adapter, persist]);

  /** Import from pasted / typed JSON text — works without DocumentPicker. */
  const importSongFromJsonText = useCallback(
    async (text: string): Promise<ImportUserSongResult<TSong, TCode>> => {
      setImporting(true);
      try {
        const parsed = parseChartText(text, adapter);
        if (!parsed.ok) {
          return parsed;
        }
        return { ok: true, song: await persist(parsed.definition, 'json') };
      } catch {
        return { ok: false, code: 'invalidJson' };
      } finally {
        setImporting(false);
      }
    },
    [adapter, persist],
  );

  const removeSong = useCallback(
    async (songId: string) => {
      try {
        setSongs(await adapter.remove(songId));
      } catch (error) {
        // A storage read that failed refuses to write rather than risk the
        // list: the song simply stays, and the next attempt can succeed.
        console.warn('Could not remove the song:', error);
      }
    },
    [adapter],
  );

  return {
    songs,
    setSongs,
    loading,
    importing,
    setImporting,
    importSong,
    importSongFromJsonText,
    removeSong,
  };
}
