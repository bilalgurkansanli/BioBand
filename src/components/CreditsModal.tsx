import { Linking, Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { MODAL_ORIENTATIONS } from './modalOrientations';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { colors } from '../theme/colors';

type Credit = {
  title: string;
  author?: string;
  licence: string;
  url?: string;
};

type CreditGroup = {
  /** i18n key for the heading; the entries themselves are not translated. */
  headingKey: string;
  items: Credit[];
};

/**
 * Attribution for everything in the app that someone else made.
 *
 * This is not decoration. The piano is the Salamander Grand Piano under
 * CC BY 3.0, and that licence requires the credit to travel with the work
 * wherever it is distributed — a line in the repository's README does not
 * reach anyone who installs the app from a store.
 *
 * The entries are deliberately kept out of the translation files: names,
 * licence identifiers and URLs are the same in every language, and copying
 * them into three catalogues invites one of the three drifting out of date and
 * quietly becoming a false attribution.
 */
const CREDITS: CreditGroup[] = [
  {
    headingKey: 'credits.instruments',
    items: [
      {
        title: 'Salamander Grand Piano V3',
        author: 'Alexander Holm',
        licence: 'CC BY 3.0',
        url: 'https://creativecommons.org/licenses/by/3.0/',
      },
      {
        title: 'tonejs-instruments — guitar, violin',
        author: 'Nicholaus Brosowsky',
        licence: 'Public domain / CC BY',
        url: 'https://github.com/nbrosowsky/tonejs-instruments',
      },
      {
        title: 'Drum kit one-shots',
        author: 'teropa/drumkit, DWSD, Karman Lyne, stomachache (Freesound)',
        licence: 'CC0 / CC BY',
        url: 'https://github.com/teropa/drumkit',
      },
      {
        title: 'Pads, FX and Turkish percussion',
        licence: 'Synthesised for BioBand — MIT',
        url: 'https://github.com/bilalgurkansanli/BioBand',
      },
    ],
  },
  {
    headingKey: 'credits.songs',
    items: [
      {
        title: 'Classical tutorial scores',
        author: 'Mutopia Project',
        licence: 'Public domain',
        url: 'https://www.mutopiaproject.org/',
      },
    ],
  },
  {
    headingKey: 'credits.software',
    items: [
      {
        title: 'Ionicons',
        author: 'Ionic',
        licence: 'MIT',
        url: 'https://ionic.io/ionicons',
      },
      {
        title: 'React Native, Expo',
        licence: 'MIT',
        url: 'https://reactnative.dev',
      },
    ],
  },
];

type Props = {
  visible: boolean;
  onClose: () => void;
};

export function CreditsModal({ visible, onClose }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const open = (url?: string) => {
    if (url) {
      void Linking.openURL(url).catch(() => {});
    }
  };

  return (
    <Modal
      supportedOrientations={MODAL_ORIENTATIONS}
      animationType="slide"
      presentationStyle="pageSheet"
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={[styles.header, { paddingTop: Math.max(28, insets.top + 16) }]}>
          <Text style={styles.headerTitle}>{t('credits.screenTitle')}</Text>
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
          <Text style={styles.intro}>{t('credits.intro')}</Text>

          {CREDITS.map((group) => (
            <View key={group.headingKey} style={styles.group}>
              <Text style={styles.groupTitle}>{t(group.headingKey)}</Text>
              {group.items.map((item) => (
                <Pressable
                  key={item.title}
                  accessibilityRole={item.url ? 'link' : undefined}
                  disabled={!item.url}
                  onPress={() => open(item.url)}
                  style={({ pressed }) => [styles.item, pressed && item.url && styles.pressed]}
                >
                  <View style={styles.itemText}>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    {item.author ? <Text style={styles.itemAuthor}>{item.author}</Text> : null}
                    <Text style={styles.itemLicence}>{item.licence}</Text>
                  </View>
                  {item.url ? (
                    <Ionicons color={colors.textSecondary} name="open-outline" size={15} />
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))}

          <Text style={styles.footer}>{t('credits.footer')}</Text>
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
  intro: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 22,
  },
  group: {
    marginBottom: 22,
  },
  groupTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  item: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  itemText: {
    flex: 1,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemAuthor: {
    color: colors.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  itemLicence: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  footer: {
    color: colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
  pressed: {
    opacity: 0.7,
  },
});
