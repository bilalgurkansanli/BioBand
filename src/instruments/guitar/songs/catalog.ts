import {
  AKDENIZ_AKSAMLARI_EVENTS,
  AKDENIZ_AKSAMLARI_PARTIAL_COUNT,
} from './akdenizAksamlari';
import { ANLAMAZDIN_EVENTS, ANLAMAZDIN_PARTIAL_COUNT } from './anlamazdin';
import { DESPACITO_EVENTS, DESPACITO_PARTIAL_COUNT } from './despacito';
import {
  CANAKKALE_TURKUSU_EVENTS,
  CANAKKALE_TURKUSU_PARTIAL_COUNT,
} from './canakkaleTurkusu';
import {
  DEGMESIN_ELLERIMIZ_EVENTS,
  DEGMESIN_ELLERIMIZ_PARTIAL_COUNT,
} from './degmesinEllerimiz';
import {
  FIKRIMIN_INCE_GULU_EVENTS,
  FIKRIMIN_INCE_GULU_PARTIAL_COUNT,
} from './fikriminInceGulu';
import {
  GAME_OF_THRONES_EVENTS,
  GAME_OF_THRONES_PARTIAL_COUNT,
} from './gameOfThrones';
import {
  YILDIZLARIN_ALTINDA_EVENTS,
  YILDIZLARIN_ALTINDA_PARTIAL_COUNT,
} from './yildizlarinAltinda';
import {
  KARAYIP_KORSANLARI_EVENTS,
  KARAYIP_KORSANLARI_PARTIAL_COUNT,
} from './karayipKorsanlari';
import {
  KNOCKIN_ON_HEAVENS_DOOR_EVENTS,
  KNOCKIN_ON_HEAVENS_DOOR_PARTIAL_COUNT,
} from './knockinOnHeavensDoor';
import { ZOMBIE_EVENTS, ZOMBIE_PARTIAL_COUNT } from './zombie';
import { BABA_TEMASI_EVENTS, BABA_TEMASI_PARTIAL_COUNT } from './babaTemasi';
import { FUR_ELISE_EVENTS, FUR_ELISE_PARTIAL_COUNT } from './furElise';
import { GREENSLEEVES_EVENTS, GREENSLEEVES_PARTIAL_COUNT } from './greensleeves';
import {
  HOTEL_CALIFORNIA_EVENTS,
  HOTEL_CALIFORNIA_PARTIAL_COUNT,
} from './hotelCalifornia';
import {
  ISPANYOL_ROMANSI_EVENTS,
  ISPANYOL_ROMANSI_PARTIAL_COUNT,
} from './ispanyolRomansi';
import {
  MY_HEART_WILL_GO_ON_EVENTS,
  MY_HEART_WILL_GO_ON_PARTIAL_COUNT,
} from './myHeartWillGoOn';
import {
  NOTHING_ELSE_MATTERS_EVENTS,
  NOTHING_ELSE_MATTERS_PARTIAL_COUNT,
} from './nothingElseMatters';
import { SARI_GELIN_EVENTS, SARI_GELIN_PARTIAL_COUNT } from './sariGelin';
import {
  STAIRWAY_TO_HEAVEN_EVENTS,
  STAIRWAY_TO_HEAVEN_PARTIAL_COUNT,
} from './stairwayToHeaven';
import { YESTERDAY_EVENTS, YESTERDAY_PARTIAL_COUNT } from './yesterday';
import {
  BALLAD_CHORDS_EVENTS,
  CAMPFIRE_CHORDS_EVENTS,
  FRET_SPRINT_EVENTS,
  GROOVE_A_EVENTS,
  LEAD_AND_CHORDS_EVENTS,
  OPEN_STRINGS_EVENTS,
  POWER_BARRE_EVENTS,
  POWER_RIFF_EVENTS,
} from './patterns';
import type { GuitarSongDefinition } from './types';

export const GUITAR_SONGS: GuitarSongDefinition[] = [
  {
    id: 'despacito',
    title: 'Despacito',
    artist: 'Luis Fonsi & Daddy Yankee',
    difficulty: 'medium',
    events: DESPACITO_EVENTS,
    partialCount: DESPACITO_PARTIAL_COUNT,
  },
  {
    id: 'game-of-thrones',
    title: 'Game of Thrones',
    artist: 'Ramin Djawadi',
    difficulty: 'medium',
    events: GAME_OF_THRONES_EVENTS,
    partialCount: GAME_OF_THRONES_PARTIAL_COUNT,
  },
  {
    id: 'akdeniz-aksamlari',
    title: 'Akdeniz Akşamları',
    artist: 'Grup Merdiven',
    difficulty: 'easy',
    events: AKDENIZ_AKSAMLARI_EVENTS,
    partialCount: AKDENIZ_AKSAMLARI_PARTIAL_COUNT,
  },
  {
    id: 'anlamazdin',
    title: 'Anlamazdın',
    artist: 'Ayla Dikmen',
    difficulty: 'medium',
    events: ANLAMAZDIN_EVENTS,
    partialCount: ANLAMAZDIN_PARTIAL_COUNT,
  },
  {
    id: 'fikrimin-ince-gulu',
    title: 'Fikrimin İnce Gülü',
    artist: 'Muallim İsmail Hakkı Bey',
    difficulty: 'easy',
    events: FIKRIMIN_INCE_GULU_EVENTS,
    partialCount: FIKRIMIN_INCE_GULU_PARTIAL_COUNT,
  },
  {
    id: 'canakkale-turkusu',
    title: 'Çanakkale Türküsü',
    artist: 'Anonim',
    difficulty: 'easy',
    events: CANAKKALE_TURKUSU_EVENTS,
    partialCount: CANAKKALE_TURKUSU_PARTIAL_COUNT,
  },
  {
    id: 'degmesin-ellerimiz',
    title: 'Değmesin Ellerimiz',
    artist: 'Model',
    difficulty: 'medium',
    events: DEGMESIN_ELLERIMIZ_EVENTS,
    partialCount: DEGMESIN_ELLERIMIZ_PARTIAL_COUNT,
  },
  {
    id: 'yildizlarin-altinda',
    title: 'Yıldızların Altında',
    artist: 'Kaptanzâde Ali Rıza Bey',
    difficulty: 'easy',
    events: YILDIZLARIN_ALTINDA_EVENTS,
    partialCount: YILDIZLARIN_ALTINDA_PARTIAL_COUNT,
  },
  {
    id: 'zombie',
    title: 'Zombie',
    artist: 'The Cranberries',
    difficulty: 'easy',
    events: ZOMBIE_EVENTS,
    partialCount: ZOMBIE_PARTIAL_COUNT,
  },
  {
    id: 'knockin-on-heavens-door',
    title: "Knockin' on Heaven's Door",
    artist: 'Bob Dylan',
    difficulty: 'easy',
    events: KNOCKIN_ON_HEAVENS_DOOR_EVENTS,
    partialCount: KNOCKIN_ON_HEAVENS_DOOR_PARTIAL_COUNT,
  },
  {
    id: 'karayip-korsanlari',
    title: 'Karayip Korsanları',
    artist: 'Hans Zimmer & Klaus Badelt',
    difficulty: 'medium',
    events: KARAYIP_KORSANLARI_EVENTS,
    partialCount: KARAYIP_KORSANLARI_PARTIAL_COUNT,
  },
  {
    id: 'ispanyol-romansi',
    title: 'İspanyol Romansı (Romance)',
    artist: 'Anonim',
    difficulty: 'medium',
    events: ISPANYOL_ROMANSI_EVENTS,
    partialCount: ISPANYOL_ROMANSI_PARTIAL_COUNT,
  },
  {
    id: 'nothing-else-matters',
    title: 'Nothing Else Matters',
    artist: 'Metallica',
    difficulty: 'medium',
    events: NOTHING_ELSE_MATTERS_EVENTS,
    partialCount: NOTHING_ELSE_MATTERS_PARTIAL_COUNT,
  },
  {
    id: 'hotel-california',
    title: 'Hotel California',
    artist: 'Eagles',
    difficulty: 'medium',
    events: HOTEL_CALIFORNIA_EVENTS,
    partialCount: HOTEL_CALIFORNIA_PARTIAL_COUNT,
  },
  {
    id: 'baba-temasi',
    title: 'The Godfather (Baba)',
    artist: 'Nino Rota',
    difficulty: 'medium',
    events: BABA_TEMASI_EVENTS,
    partialCount: BABA_TEMASI_PARTIAL_COUNT,
  },
  {
    id: 'my-heart-will-go-on',
    title: 'My Heart Will Go On',
    artist: 'Céline Dion',
    difficulty: 'easy',
    events: MY_HEART_WILL_GO_ON_EVENTS,
    partialCount: MY_HEART_WILL_GO_ON_PARTIAL_COUNT,
  },
  {
    id: 'fur-elise',
    title: 'Für Elise',
    artist: 'Ludwig van Beethoven',
    difficulty: 'medium',
    events: FUR_ELISE_EVENTS,
    partialCount: FUR_ELISE_PARTIAL_COUNT,
  },
  {
    id: 'greensleeves',
    title: 'Greensleeves',
    artist: 'Anonim',
    difficulty: 'easy',
    events: GREENSLEEVES_EVENTS,
    partialCount: GREENSLEEVES_PARTIAL_COUNT,
  },
  {
    id: 'stairway-to-heaven',
    title: 'Stairway to Heaven',
    artist: 'Led Zeppelin',
    difficulty: 'medium',
    events: STAIRWAY_TO_HEAVEN_EVENTS,
    partialCount: STAIRWAY_TO_HEAVEN_PARTIAL_COUNT,
  },
  {
    id: 'sari-gelin',
    title: 'Sarı Gelin',
    artist: 'Anonim',
    difficulty: 'easy',
    events: SARI_GELIN_EVENTS,
    partialCount: SARI_GELIN_PARTIAL_COUNT,
  },
  {
    id: 'yesterday',
    title: 'Yesterday',
    artist: 'The Beatles',
    difficulty: 'easy',
    events: YESTERDAY_EVENTS,
    partialCount: YESTERDAY_PARTIAL_COUNT,
  },
  {
    id: 'open-strings',
    title: 'Open Strings',
    difficulty: 'easy',
    events: OPEN_STRINGS_EVENTS,
    partialCount: 6,
  },
  {
    id: 'campfire-chords',
    title: 'Campfire Chords',
    difficulty: 'easy',
    events: CAMPFIRE_CHORDS_EVENTS,
    partialCount: 8,
  },
  {
    id: 'power-riff',
    title: 'Power Riff',
    difficulty: 'easy',
    events: POWER_RIFF_EVENTS,
    partialCount: 7,
  },
  {
    id: 'power-barre',
    title: 'Power & Barre',
    difficulty: 'medium',
    events: POWER_BARRE_EVENTS,
    partialCount: 8,
  },
  {
    id: 'groove-a',
    title: 'Groove on A',
    difficulty: 'medium',
    events: GROOVE_A_EVENTS,
    partialCount: 8,
  },
  {
    id: 'ballad-chords',
    title: 'Ballad Chords',
    difficulty: 'medium',
    events: BALLAD_CHORDS_EVENTS,
    partialCount: 8,
  },
  {
    id: 'lead-and-chords',
    title: 'Lead & Chords',
    difficulty: 'hard',
    events: LEAD_AND_CHORDS_EVENTS,
    partialCount: 10,
  },
  {
    id: 'fret-sprint',
    title: 'Fret Sprint',
    difficulty: 'hard',
    events: FRET_SPRINT_EVENTS,
    partialCount: 12,
  },
];

export const GUITAR_SONG_CATALOG = GUITAR_SONGS;

export function getGuitarSongById(id: string): GuitarSongDefinition | undefined {
  return GUITAR_SONGS.find((song) => song.id === id);
}
