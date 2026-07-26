import { Component, type ErrorInfo, type ReactNode } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, Share, StyleSheet, Text, View } from 'react-native';

import i18n from '../i18n';
import { formatCrash, type CrashRecord } from '../diagnostics/crashLog';
import { reportCrash } from '../diagnostics/errorReporter';
import { colors } from '../theme/colors';

type Props = {
  children: ReactNode;
};

type State = {
  hasError: boolean;
  /** Filled in by componentDidCatch, one render after `hasError`. */
  record: CrashRecord | null;
  detailsOpen: boolean;
};

const INITIAL_STATE: State = { hasError: false, record: null, detailsOpen: false };

/**
 * Last line of defence for the whole app.
 *
 * Without one, a single throw during render unmounts the entire tree and the
 * user is left staring at a blank screen with no way back but force-quitting.
 * This keeps something on screen, records what happened, and gives the user
 * a report to send back.
 *
 * Has to be a class: React only offers `componentDidCatch` to class
 * components, and there is no hook equivalent.
 */
export class AppErrorBoundary extends Component<Props, State> {
  state: State = INITIAL_STATE;

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.setState({ record: reportCrash(error, 'render', info.componentStack ?? undefined) });
  }

  private reset = () => {
    this.setState(INITIAL_STATE);
  };

  private toggleDetails = () => {
    this.setState((current) => ({ ...current, detailsOpen: !current.detailsOpen }));
  };

  private share = () => {
    const { record } = this.state;
    if (record) {
      void Share.share({ message: formatCrash(record) });
    }
  };

  /**
   * Translations may themselves be what failed to load, so every string here
   * falls back to English rather than rendering a bare key at the user.
   */
  private label(key: string, fallback: string): string {
    try {
      const value = i18n.t(key);
      return !value || value === key ? fallback : value;
    } catch {
      return fallback;
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { record, detailsOpen } = this.state;

    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons color="#FFFFFF" name="warning-outline" size={26} />
          </View>
          <Text style={styles.title}>{this.label('errors.crashTitle', 'Something went wrong')}</Text>
          <Text style={styles.message}>
            {this.label(
              'errors.crashMessage',
              'BioBand hit an unexpected problem. Your recordings and progress are safe.',
            )}
          </Text>

          <Pressable
            onPress={this.reset}
            style={({ pressed }) => [styles.primaryBtn, pressed && styles.pressed]}
          >
            <Ionicons color="#FFFFFF" name="refresh" size={18} />
            <Text style={styles.primaryText}>{this.label('errors.crashRetry', 'Try again')}</Text>
          </Pressable>

          <View style={styles.secondaryRow}>
            <Pressable
              onPress={this.toggleDetails}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Text style={styles.secondaryText}>
                {detailsOpen
                  ? this.label('errors.crashHideDetails', 'Hide details')
                  : this.label('errors.crashDetails', 'Details')}
              </Text>
            </Pressable>
            <Pressable
              onPress={this.share}
              style={({ pressed }) => [styles.secondaryBtn, pressed && styles.pressed]}
            >
              <Ionicons color={colors.text} name="share-outline" size={15} />
              <Text style={styles.secondaryText}>
                {this.label('errors.crashShare', 'Share report')}
              </Text>
            </Pressable>
          </View>

          {detailsOpen ? (
            <ScrollView style={styles.details}>
              <Text selectable style={styles.detailsText}>
                {record ? formatCrash(record) : ''}
              </Text>
            </ScrollView>
          ) : null}
        </View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    maxWidth: 440,
    padding: 22,
    width: '100%',
  },
  iconWrap: {
    alignItems: 'center',
    backgroundColor: colors.error,
    borderRadius: 28,
    height: 56,
    justifyContent: 'center',
    marginBottom: 16,
    width: 56,
  },
  title: {
    color: colors.text,
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    color: colors.textSecondary,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 20,
    textAlign: 'center',
  },
  primaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 12,
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    paddingVertical: 13,
    width: '100%',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
    width: '100%',
  },
  secondaryBtn: {
    alignItems: 'center',
    backgroundColor: colors.surfaceLight,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    paddingVertical: 10,
  },
  secondaryText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  details: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 12,
    maxHeight: 220,
    padding: 12,
    width: '100%',
  },
  detailsText: {
    color: colors.textSecondary,
    fontFamily: 'monospace',
    fontSize: 11,
    lineHeight: 16,
  },
  pressed: {
    opacity: 0.8,
  },
});
