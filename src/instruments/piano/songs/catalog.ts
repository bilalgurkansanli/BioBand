import { ahuSong } from './ahu';
import { ayaBenzerSong } from './ayaBenzer';
import { ayyBenHalaRuyadaSong } from './ayyBenHalaRuyada';
import { billieJeanSong } from './billieJean';
import { biliyorsunSong } from './biliyorsun';
import { canonInDSong } from './canonInD';
import { chopinNocturneSong } from './chopinNocturne';
import { clairDeLuneSong } from './clairDeLune';
import { furEliseSong } from './furElise';
import { gulpembeSong } from './gulpembe';
import { jingleBellsSong } from './jingleBells';
import { kusuraBakmaSong } from './kusuraBakma';
import { mesafeSong } from './mesafe';
import { neyleyimIstanbulSong } from './neyleyimIstanbul';
import { odeToJoySong } from './odeToJoy';
import { olsunSong } from './olsun';
import { riverFlowsInYouSong } from './riverFlowsInYou';
import { shapeOfYouSong } from './shapeOfYou';
import { simarikSong } from './simarik';
import { someoneLikeYouSong } from './someoneLikeYou';
import { tutamiyorumZamaniSong } from './tutamiyorumZamani';
import { turkMarsiSong } from './turkMarsi';
import { uskudaraGiderkenSong } from './uskudaraGiderken';
import { yasanacaksaSong } from './yasanacaksa';
import type { CatalogSong, SongDefinition } from './types';

// Song catalog: every song we plan to offer. Entries with `song: null` are
// awaiting transcription and appear as "coming soon" in the UI.
//
// `difficulty` = how hard the melody is to play (tempo, leaps, density).
// Foreign/viral classics lead the list (Tümü) for easy discovery — a new
// user hits familiar, simple songs first before the deeper Turkish pop set.
export const SONG_CATALOG: CatalogSong[] = [
  {
    id: 'turk-marsi',
    title: 'Türk Marşı',
    artist: 'Wolfgang Amadeus Mozart',
    difficulty: 'hard',
    song: turkMarsiSong,
  },
  {
    id: 'jingle-bells',
    title: 'Jingle Bells',
    artist: 'James Lord Pierpont',
    difficulty: 'easy',
    song: jingleBellsSong,
  },
  {
    id: 'uskudara-giderken',
    title: "Üsküdar'a Giderken",
    artist: 'Anonim',
    difficulty: 'easy',
    song: uskudaraGiderkenSong,
  },
  {
    id: 'ode-to-joy',
    title: 'Ode to Joy',
    artist: 'Ludwig van Beethoven',
    difficulty: 'easy',
    song: odeToJoySong,
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    artist: 'Ludwig van Beethoven',
    difficulty: 'easy',
    song: furEliseSong,
  },
  {
    id: 'river-flows-in-you',
    title: 'River Flows in You',
    artist: 'Yiruma',
    difficulty: 'easy',
    song: riverFlowsInYouSong,
  },
  {
    id: 'canon-in-d',
    title: 'Canon in D',
    artist: 'Johann Pachelbel',
    difficulty: 'easy',
    song: canonInDSong,
  },
  {
    id: 'clair-de-lune',
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    difficulty: 'medium',
    song: clairDeLuneSong,
  },
  {
    id: 'chopin-nocturne',
    title: 'Nocturne Op. 9 No. 2',
    artist: 'Frédéric Chopin',
    difficulty: 'medium',
    song: chopinNocturneSong,
  },
  {
    id: 'shape-of-you',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    difficulty: 'medium',
    song: shapeOfYouSong,
  },
  {
    id: 'someone-like-you',
    title: 'Someone Like You',
    artist: 'Adele',
    difficulty: 'medium',
    song: someoneLikeYouSong,
  },
  {
    id: 'billie-jean',
    title: 'Billie Jean',
    artist: 'Michael Jackson',
    difficulty: 'medium',
    song: billieJeanSong,
  },
  {
    id: 'neyleyim-istanbul',
    title: "Neyleyim İstanbul'u",
    artist: 'Murat Dalkılıç',
    difficulty: 'hard',
    song: neyleyimIstanbulSong,
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
