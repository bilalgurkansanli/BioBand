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
