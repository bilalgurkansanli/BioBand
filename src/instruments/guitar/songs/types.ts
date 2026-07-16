export type GuitarSongEvent = {
  soundId: string;
  atMs: number;
};

export type GuitarSongDifficulty = 'easy' | 'medium' | 'hard';

export type GuitarSongScope = 'partial' | 'full';

export type GuitarSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  /** Optional artist line in the song picker. */
  artist?: string;
  difficulty: GuitarSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: GuitarSongEvent[];
  /** Inclusive count for the “part” excerpt. */
  partialCount?: number;
};

export type ResolvedGuitarSession = {
  events: GuitarSongEvent[];
  scope: GuitarSongScope;
};
