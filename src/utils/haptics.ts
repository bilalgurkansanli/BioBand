import { Platform, Vibration } from 'react-native';

/**
 * Tactile feedback for playing an instrument.
 *
 * `Vibration.vibrate` was doing this before, and on iOS it does not reach the
 * Taptic Engine at all — it falls through to `AudioServicesPlaySystemSound`,
 * the old buzz motor, which ignores the duration and fires the same heavy
 * ~400 ms rumble every time. Fine on Android, where the pattern is honoured;
 * on an iPhone a piano key felt like a notification going off.
 *
 * expo-haptics reaches the real feedback generators, so a key press can be a
 * light tap and a drum hit a firm one — which is the distinction the old code
 * could not express on either platform.
 *
 * Android still goes through `Vibration` with tuned durations: expo-haptics
 * maps everything there onto a small set of predefined effects, and a 35 ms
 * tick reads better under a finger than the nearest preset.
 */

type Impact = 'light' | 'medium' | 'rigid' | 'soft';

type HapticsModule = typeof import('expo-haptics');

let cached: HapticsModule | null | undefined;

function getHaptics(): HapticsModule | null {
  if (cached === undefined) {
    try {
      // Required lazily, like the notifications module: a static import of a
      // native module that is missing from the running binary throws at load
      // and takes the whole screen down with it.
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      cached = require('expo-haptics') as HapticsModule;
    } catch {
      // Native module missing — an older dev client, or a bare JS environment
      // in a test. Feedback is a nicety; never let its absence throw.
      cached = null;
    }
  }
  return cached;
}

/**
 * Playing fast should still feel like separate taps. iOS queues feedback
 * requests, and past roughly forty a second they smear into one long buzz
 * instead of landing individually — below this gap a human is not perceiving
 * them apart anyway.
 */
const MIN_GAP_MS = 25;
let lastFiredAt = 0;

function throttled(): boolean {
  const now = Date.now();
  if (now - lastFiredAt < MIN_GAP_MS) {
    return true;
  }
  lastFiredAt = now;
  return false;
}

const ANDROID_MS: Record<Impact, number> = {
  soft: 12,
  light: 20,
  medium: 35,
  rigid: 45,
};

function impact(style: Impact): void {
  if (throttled()) {
    return;
  }

  if (Platform.OS !== 'ios') {
    // The [wait, duration] form is honoured more consistently than a bare
    // number across Android vibrators.
    Vibration.vibrate([0, ANDROID_MS[style]]);
    return;
  }

  const Haptics = getHaptics();
  if (!Haptics) {
    return;
  }
  const styles = {
    light: Haptics.ImpactFeedbackStyle.Light,
    medium: Haptics.ImpactFeedbackStyle.Medium,
    rigid: Haptics.ImpactFeedbackStyle.Rigid,
    soft: Haptics.ImpactFeedbackStyle.Soft,
  };
  // Deliberately not awaited: a note must sound the moment the finger lands,
  // and nothing downstream depends on the feedback having been delivered.
  void Haptics.impactAsync(styles[style]).catch(() => {});
}

/** A piano key, a plucked string, a bowed note — the lightest touch. */
export function hapticNote(): void {
  impact('light');
}

/** A drum or pad hit. Firmer, because the gesture is a strike. */
export function hapticHit(): void {
  impact('medium');
}

/** The softest tap, for pads where a hit should not feel like a drum. */
export function hapticSoft(): void {
  impact('soft');
}

/**
 * Moving between discrete choices — toggling a sequencer step, snapping a clip
 * to the grid. iOS has a dedicated generator for exactly this, and it reads as
 * "something changed" rather than "something was struck".
 */
export function hapticSelection(): void {
  if (throttled()) {
    return;
  }

  if (Platform.OS !== 'ios') {
    Vibration.vibrate([0, 12]);
    return;
  }

  const Haptics = getHaptics();
  if (!Haptics) {
    return;
  }
  void Haptics.selectionAsync().catch(() => {});
}
