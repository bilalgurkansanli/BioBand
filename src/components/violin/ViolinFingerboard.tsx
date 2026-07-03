import { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { POSITION_COUNT } from '../../instruments/violin/violinNotes';
import { VIOLIN_PHRASES, type PhraseId } from '../../instruments/violin/violinPhrases';
import { VIOLIN_STRINGS, type ViolinStringId } from '../../instruments/violin/violinSounds';
import { PhraseBar } from './PhraseBar';
import { ViolinNoteCell } from './ViolinNoteCell';

const LABEL_COL_WIDTH = 28;
const CELL_GAP = 2;
const MIN_CELL_SIZE = 28;

type ViolinFingerboardProps = {
  onPlayNote: (stringId: ViolinStringId, position: number) => void;
  onPlayPhrase: (phraseId: PhraseId) => void;
};

export function ViolinFingerboard({ onPlayNote, onPlayPhrase }: ViolinFingerboardProps) {
  const { t } = useTranslation();
  const [boardWidth, setBoardWidth] = useState(0);
  const [activeCell, setActiveCell] = useState<string | null>(null);

  const phrases = VIOLIN_PHRASES.map((phrase) => ({
    id: phrase.id,
    label: t(phrase.labelKey),
  }));

  const cellSize = useMemo(() => {
    if (boardWidth <= 0) {
      return MIN_CELL_SIZE;
    }
    const available = boardWidth - LABEL_COL_WIDTH - POSITION_COUNT * CELL_GAP;
    return Math.max(MIN_CELL_SIZE, Math.floor(available / POSITION_COUNT));
  }, [boardWidth]);

  const handleLayout = (event: LayoutChangeEvent) => {
    setBoardWidth(event.nativeEvent.layout.width);
  };

  const handlePressIn = (stringId: ViolinStringId, position: number) => {
    onPlayNote(stringId, position);
    setActiveCell(`${stringId}:${position}`);
  };

  const handlePressOut = () => {
    setActiveCell(null);
  };

  return (
    <View style={styles.container}>
      <PhraseBar phrases={phrases} onPlayPhrase={(id) => onPlayPhrase(id as PhraseId)} />

      <View onLayout={handleLayout} style={styles.board}>
        <View style={styles.headerRow}>
          <View style={styles.labelSpacer} />
          {Array.from({ length: POSITION_COUNT }, (_, position) => (
            <Text
              key={position}
              style={[styles.positionLabel, { width: cellSize + CELL_GAP }]}
            >
              {position}
            </Text>
          ))}
        </View>

        {VIOLIN_STRINGS.map((string) => (
          <View key={string.id} style={styles.stringRow}>
            <Text style={styles.stringLabel}>{t(string.labelKey)}</Text>
            <View style={styles.cellsRow}>
              {Array.from({ length: POSITION_COUNT }, (_, position) => {
                const cellKey = `${string.id}:${position}`;
                return (
                  <ViolinNoteCell
                    key={cellKey}
                    isActive={activeCell === cellKey}
                    isOpenString={position === 0}
                    onPressIn={() => handlePressIn(string.id, position)}
                    onPressOut={handlePressOut}
                    size={cellSize}
                  />
                );
              })}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  board: {
    backgroundColor: '#2A1F12',
    borderColor: '#3D2914',
    borderRadius: 12,
    borderWidth: 2,
    padding: 10,
  },
  headerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 6,
  },
  labelSpacer: {
    width: LABEL_COL_WIDTH,
  },
  positionLabel: {
    color: '#A08060',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
  },
  stringRow: {
    alignItems: 'center',
    flexDirection: 'row',
    marginBottom: 4,
  },
  stringLabel: {
    color: '#E8D5B7',
    fontSize: 16,
    fontWeight: '700',
    width: LABEL_COL_WIDTH,
  },
  cellsRow: {
    flex: 1,
    flexDirection: 'row',
  },
});
