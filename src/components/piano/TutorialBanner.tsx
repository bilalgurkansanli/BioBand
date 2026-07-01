import { StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { colors } from '../../theme/colors';
import type { TutorialPhase } from '../../hooks/usePianoTutorial';

type TutorialBannerProps = {
  phase: TutorialPhase;
  songTitleKey?: string;
};

export function TutorialBanner({ phase, songTitleKey }: TutorialBannerProps) {
  const { t } = useTranslation();

  if (phase === 'idle' || phase === 'pickSong' || phase === 'readyToWatch') {
    return null;
  }

  let messageKey = 'tutorial.banner.watching';
  if (phase === 'practice') {
    messageKey = 'tutorial.banner.practice';
  } else if (phase === 'complete') {
    messageKey = 'tutorial.banner.complete';
  }

  return (
    <View style={styles.banner}>
      {songTitleKey ? (
        <Text style={styles.songName}>{t(songTitleKey)}</Text>
      ) : null}
      <Text style={styles.message}>{t(messageKey)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.surfaceLight,
    borderColor: colors.accent,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  songName: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 2,
  },
  message: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
});
