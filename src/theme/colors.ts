export const colors = {
  background: '#0D0D0D',
  surface: '#1A1A2E',
  surfaceLight: '#252542',
  text: '#FFFFFF',
  textSecondary: '#A0A0A0',
  accent: '#6C5CE7',
  accentMuted: '#5A4BD1',
  error: '#E74C3C',
  border: '#2A2A4A',

  // The colours that were written out by hand dozens of times. Named for what
  // they do, so a change is made once.

  /**
   * White that stays white: labels and icons on a coloured fill (accent,
   * record and delete buttons), and white fills and borders. `text` is the
   * colour of words on the app's own dark surfaces — the same value today,
   * but not the same job.
   */
  white: '#FFFFFF',
  black: '#000000',
  /** A Switch's track when off, a slider's empty track, toolbar hairlines. */
  controlTrack: '#3A3A3C',
  /** A Switch's thumb when off. */
  controlThumbOff: '#7A7A7E',
  /** Recording: the toolbar's record button and the record dot. */
  record: '#FF3B30',
  /** Tutorial mode: the game button, the tutorial picks and their headings. */
  gold: '#FFD54F',
  /** The dim behind the instrument screens' modals. */
  backdrop: 'rgba(0, 0, 0, 0.65)',
  /** The lighter dim behind confirmations and Studio dialogs. */
  backdropSoft: 'rgba(0,0,0,0.55)',
} as const;
