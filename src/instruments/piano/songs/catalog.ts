import { ahuSong } from './ahu';
import { ayaBenzerSong } from './ayaBenzer';
import { ayyBenHalaRuyadaSong } from './ayyBenHalaRuyada';
import { billieJeanSong } from './billieJean';
import { biliyorsunSong } from './biliyorsun';
import { gulpembeSong } from './gulpembe';
import { jingleBellsSong } from './jingleBells';
import { kusuraBakmaSong } from './kusuraBakma';
import { mesafeSong } from './mesafe';
import { neyleyimIstanbulSong } from './neyleyimIstanbul';
import { odeToJoySong } from './odeToJoy';
import { olsunSong } from './olsun';
import { simarikSong } from './simarik';
import { tutamiyorumZamaniSong } from './tutamiyorumZamani';
import { turkMarsiSong } from './turkMarsi';
import { uskudaraGiderkenSong } from './uskudaraGiderken';
import { yasanacaksaSong } from './yasanacaksa';
import type { CatalogSong, SongDefinition, SongDifficulty } from './types';

// Turkish catalog: every song we plan to offer. Entries with `song: null`
// are awaiting transcription and appear as "coming soon" in the UI.
//
// `difficulty` = how hard the melody is to play (tempo, leaps, density).
// Top of list (Tümü): classics + Neyleyim first for discovery.
export const SONG_CATALOG: CatalogSong[] = [
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    artist: 'James Lord Pierpont',
    difficulty: 'easy',
    song: jingleBellsSong,
  },
  {
    id: 'turk-marsi',
    title: 'Türk Marşı',
    artist: 'Wolfgang Amadeus Mozart',
    difficulty: 'hard',
    song: turkMarsiSong,
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    difficulty: 'easy',
    song: odeToJoySong,
  },
  {
    id: 'neyleyim-istanbul',
    title: "Neyleyim İstanbul'u",
    artist: 'Murat Dalkılıç',
    difficulty: 'hard',
    song: neyleyimIstanbulSong,
  },
  {
    id: 'billie-jean',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    difficulty: 'medium',
    song: billieJeanSong,
  },
  {
    id: 'mesafe',
    title: 'Mesafe',
    artist: 'Serdar Ortaç',
    difficulty: 'medium',
    song: mesafeSong,
  },
  {
    id: 'simarik',
    title: 'Şımarık',
    artist: 'Tarkan',
    difficulty: 'hard',
    song: simarikSong,
  },
  {
    id: 'biliyorsun',
    title: 'Biliyorsun',
    artist: 'Sezen Aksu',
    difficulty: 'easy',
    song: biliyorsunSong,
  },
  {
    id: 'gulpembe',
    title: 'Gülpembe',
    artist: 'Barış Manço',
    difficulty: 'easy',
    song: gulpembeSong,
  },
  {
    id: 'tutamiyorum-zamani',
    title: 'Tutamıyorum Zamanı',
    artist: 'Müslüm Gürses',
    difficulty: 'hard',
    song: tutamiyorumZamaniSong,
  },
  {
    id: 'olsun',
    title: 'Olsun',
    artist: 'Sertab Erener',
    difficulty: 'medium',
    song: olsunSong,
  },
  {
    id: 'aya-benzer',
    title: 'Aya Benzer',
    artist: 'Mustafa Sandal',
    difficulty: 'medium',
    song: ayaBenzerSong,
  },
  {
    id: 'uskudara-giderken',
    title: "Üsküdar'a Giderken",
    artist: 'Anonim',
    difficulty: 'easy',
    song: uskudaraGiderkenSong,
  },
  {
    id: 'yasanacaksa',
    title: 'Yaşanacaksa',
    artist: 'Manifest',
    difficulty: 'easy',
    song: yasanacaksaSong,
  },
  {
    id: 'kusura-bakma',
    title: 'Kusura Bakma',
    artist: 'BLOK3',
    difficulty: 'hard',
    song: kusuraBakmaSong,
  },
  {
    id: 'ayy-ben-hala-ruyada',
    title: 'Ayy / Ben Hala Rüyada',
    artist: 'Oğuzhan Koç',
    difficulty: 'hard',
    song: ayyBenHalaRuyadaSong,
  },
  {
    id: 'ahu',
    title: 'Ahu',
    artist: 'Mabel Matiz',
    difficulty: 'medium',
    song: ahuSong,
  },
];

/** Songs that are actually playable today (transcribed). */
export const PIANO_SONGS: SongDefinition[] = SONG_CATALOG.filter(
  (entry): entry is CatalogSong & { song: SongDefinition } => entry.song !== null,
).map((entry) => entry.song);

export function getSongById(id: string): SongDefinition | undefined {
  return PIANO_SONGS.find((song) => song.id === id);
}

export function getCatalogDifficulty(songId: string): SongDifficulty | undefined {
  return SONG_CATALOG.find((entry) => entry.id === songId)?.difficulty;
}
