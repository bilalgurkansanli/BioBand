import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { FeatureCard } from '../components/FeatureCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { ScreenHeader } from '../components/ScreenHeader';
import { colors } from '../theme/colors';

export function HomeScreen() {
  const { t } = useTranslation();

  return (
    <ScreenContainer>
      <ScrollView
        contentContainerStyle={styles.content}
        style={styles.scroll}
      >
        <ScreenHeader title={t('tabs.home')} />
        <Text style={styles.welcome}>{t('home.welcome')}</Text>
        <Text style={styles.subtitle}>{t('home.subtitle')}</Text>

        <View style={styles.features}>
          <FeatureCard
            description={t('home.features.instruments.description')}
            title={t('home.features.instruments.title')}
          />
          <FeatureCard
            description={t('home.features.recordings.description')}
            title={t('home.features.recordings.title')}
          />
          <FeatureCard
            description={t('home.features.learn.description')}
            title={t('home.features.learn.title')}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  welcome: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  features: {
    marginTop: 8,
  },
});
