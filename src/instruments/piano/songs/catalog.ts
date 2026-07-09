import { gulpembeSong } from './gulpembe';
import { jingleBellsSong } from './jingleBells';
import { neyleyimIstanbulSong } from './neyleyimIstanbul';
import { odeToJoySong } from './odeToJoy';
import type { CatalogSong, SongDefinition } from './types';

// Turkish catalog: every song we plan to offer. Entries with `song: null`
// are awaiting transcription and appear as "coming soon" in the UI.
export const SONG_CATALOG: CatalogSong[] = [
  {
    id: 'neyleyim-istanbul',
    title: "Neyleyim İstanbul'u",
    artist: 'Murat Dalkılıç',
    song: neyleyimIstanbulSong,
  },
  { id: 'mesafe', title: 'Mesafe', artist: 'Serdar Ortaç', song: null },
  { id: 'simarik', title: 'Şımarık', artist: 'Tarkan', song: null },
  { id: 'biliyorsun', title: 'Biliyorsun', artist: 'Sezen Aksu', song: null },
  { id: 'gulpembe', title: 'Gülpembe', artist: 'Barış Manço', song: gulpembeSong },
  {
    id: 'tutamiyorum-zamani',
    title: 'Tutamıyorum Zamanı',
    artist: 'Müslüm Gürses',
    song: null,
  },
  { id: 'olsun', title: 'Olsun', artist: 'Sertab Erener', song: null },
  { id: 'aya-benzer', title: 'Aya Benzer', artist: 'Mustafa Sandal', song: null },
  { id: 'bas-harfi-ben', title: 'Baş Harfi Ben', artist: 'Kenan Doğulu', song: null },
  { id: 'yasanacaksa', title: 'Yaşanacaksa', artist: 'Manifest', song: null },
  { id: 'kusura-bakma', title: 'Kusura Bakma', artist: 'BLOK3', song: null },
  { id: 'kucucugum', title: 'Küçücüğüm', artist: 'Yalın', song: null },
  {
    id: 'ayy-ben-hala-ruyada',
    title: 'Ayy / Ben Hala Rüyada',
    artist: 'Oğuzhan Koç',
    song: null,
  },
  { id: 'ahu', title: 'Ahu', artist: 'Mabel Matiz', song: null },
  { id: 'gozlerime-bak', title: 'Gözlerime Bak', artist: 'Mert Demir', song: null },
  // Classics — always playable, good for first practice.
  { id: 'jingle-bells', title: 'Jingle Bells', artist: 'James Lord Pierpont', song: jingleBellsSong },
  { id: 'ode-to-joy', title: 'Ode to Joy', artist: 'Ludwig van Beethoven', song: odeToJoySong },
];

/** Songs that are actually playable today (transcribed). */
export const PIANO_SONGS: SongDefinition[] = SONG_CATALOG.filter(
  (entry): entry is CatalogSong & { song: SongDefinition } => entry.song !== null,
).map((entry) => entry.song);

export function getSongById(id: string): SongDefinition | undefined {
  return PIANO_SONGS.find((song) => song.id === id);
}
