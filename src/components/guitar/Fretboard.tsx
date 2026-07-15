import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ChordBar } from './ChordBar';
import { GuitarStringRow } from './GuitarStringRow';
import { GUITAR_CHORDS, type ChordId } from '../../instruments/guitar/guitarChords';
import {
  GUITAR_MAX_FRET,
  GUITAR_STRINGS,
  parseGuitarSoundId,
  type GuitarStringId,
} from '../../instruments/guitar/guitarSounds';
import { colors } from '../../theme/colors';

type FretboardProps = {
  onPluck: (stringId: GuitarStringId, fret: number) => void;
  onStrum: (chordId: ChordId) => void;
  guideSoundId?: string | null;
  strongGuide?: boolean;
  showFretNumbers?: boolean;
  accent?: string;
  stageBg?: string;
};

const STRING_THICKNESS: Record<GuitarStringId, number> = {
  s6: 3.5,
  s5: 3,
  s4: 2.5,
  s3: 2,
  s2: 1.5,
  s1: 1.2,
};

export function Fretboard({
  onPluck,
  onStrum,
  guideSoundId = null,
  strongGuide = true,
  showFretNumbers = false,
  accent = colors.accent,
  stageBg = colors.background,
}: FretboardProps) {
  const { t } = useTranslation();

  const parsed = guideSoundId ? parseGuitarSoundId(guideSoundId) : null;
  const guideChordId = parsed?.kind === 'chord' ? parsed.chordId : null;
  const guideStringId = parsed?.kind === 'pluck' ? parsed.stringId : null;
  const guideFret = parsed?.kind === 'pluck' ? parsed.fret : null;

  const chords = GUITAR_CHORDS.map((chord) => ({
    id: chord.id,
    label: t(chord.labelKey),
  }));

  const fretHeaders = Array.from({ length: GUITAR_MAX_FRET + 1 }, (_, i) => i);

  return (
    <View style={[styles.container, { backgroundColor: stageBg }]}>
      <ChordBar
        chords={chords}
        guideChordId={guideChordId}
        onStrum={(id) => onStrum(id as ChordId)}
        strongGuide={strongGuide}
        accent={accent}
      />

      <View style={styles.board}>
        {showFretNumbers ? (
          <View style={styles.headerRow}>
            <View style={styles.headerSpacer} />
            <View style={styles.headerFrets}>
              {fretHeaders.map((fret) => (
                <Text key={fret} style={styles.headerLabel}>
                  {fret === 0 ? 'O' : String(fret)}
                </Text>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.strings}>
          {GUITAR_STRINGS.map((string) => (
            <GuitarStringRow
              key={string.id}
              accent={accent}
              guideFret={guideStringId === string.id ? guideFret : null}
              label={string.label}
              onPluck={(fret) => onPluck(string.id, fret)}
              showFretNumbers={false}
              stringThickness={STRING_THICKNESS[string.id]}
              strongGuide={strongGuide}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  board: {
    flex: 1,
    minHeight: 0,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 6,
    marginBottom: 2,
  },
  headerSpacer: {
    width: 18,
  },
  headerFrets: {
    flex: 1,
    flexDirection: 'row',
  },
  headerLabel: {
    color: colors.textSecondary,
    flex: 1,
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
  },
  strings: {
    flex: 1,
    justifyContent: 'space-evenly',
  },
});
