import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from './modalOrientations';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme/colors';
import { openPrivacyPolicy } from '../utils/openPrivacyPolicy';

type PrivacySection = { title: string; body: string };

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function PrivacyPolicyModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const sections = t('privacy.sections', { returnObjects: true }) as PrivacySection[];

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS} animationType="slide" presentationStyle="pageSheet" visible={visible} onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(28, insets.top + 16) }]}>
          <Text style={styles.headerTitle}>{t('privacy.screenTitle')}</Text>
          <Pressable
            accessibilityLabel={t('common.close')}
            hitSlop={8}
            onPress={onClose}
            style={({ pressed }) => [styles.closeBtn, pressed && styles.pressed]}
          >
            <Ionicons color={colors.text} name="close" size={20} />
          </Pressable>
        </View>
        <ScrollView
          contentContainerStyle={[
            styles.scroll,
            { paddingBottom: Math.max(28, insets.bottom + 16) },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.updated}>{t('privacy.lastUpdated')}</Text>
          {sections.map((section) => (
            <View key={section.title} style={styles.section}>
              <Text style={styles.sectionTitle}>{section.title}</Text>
              <Text style={styles.sectionBody}>{section.body}</Text>
            </View>
          ))}
          <Text style={styles.contact}>
            {t('privacy.contactLabel')} {t('privacy.contactEmail')}
          </Text>
          <Pressable
            onPress={() => void openPrivacyPolicy()}
            style={({ pressed }) => [styles.externalLink, pressed && styles.pressed]}
          >
            <Ionicons color={colors.accent} name="logo-github" size={15} />
            <Text style={styles.externalLinkText}>{t('privacy.viewOnGithub')}</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    flex: 1,
  },
  header: {
    alignItems: 'center',
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  headerTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '700',
  },
  closeBtn: {
    alignItems: 'center',
    backgroundColor: `${colors.error}22`,
    borderRadius: 18,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  scroll: {
    padding: 20,
  },
  updated: {
    color: colors.textSecondary,
    fontSize: 12,
    marginBottom: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  contact: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginTop: 4,
    marginBottom: 20,
  },
  externalLink: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    flexDirection: 'row',
    gap: 6,
  },
  externalLinkText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
  },
  pressed: {
    opacity: 0.7,
  },
});
