export type ViolinSongEvent = {
  soundId: string;
  atMs: number;
};

export type ViolinSongDifficulty = 'easy' | 'medium' | 'hard';

export type ViolinSongScope = 'partial' | 'full';

export type ViolinSongDefinition = {
  id: string;
  /** Display title — proper names, not translated. */
  title: string;
  /** Optional artist line in the song picker. */
  artist?: string;
  difficulty: ViolinSongDifficulty;
  /** Full chart events, sorted by atMs. */
  events: ViolinSongEvent[];
  /** Inclusive count for the “part” excerpt. */
  partialCount?: number;
};

export type ResolvedViolinSession = {
  events: ViolinSongEvent[];
  scope: ViolinSongScope;
};
