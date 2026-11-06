import AsyncStorage from '@react-native-async-storage/async-storage';
import { changeLanguage } from 'i18next';
import { NavigationContainer, type InitialState } from '@react-navigation/native';
import { act, createElement, type ReactElement } from 'react';
import { Dimensions, Linking, Platform } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer';

import App from '../../App';
import { initI18n } from '../i18n';
import { RootNavigator } from '../navigation/RootNavigator';
import { formatChordSoundId, formatPluckSoundId } from '../instruments/guitar/guitarSounds';
import { greatFairyFountainSong } from '../instruments/piano/songs/greatFairyFountain';
import {
  getPracticeMsForDay,
  loadProfileProgress,
  todayKey,
} from '../storage/profileProgressStorage';
import { writtenFiles } from '../testing/nativeFakes';
import { saveRecording } from '../storage/recordingsStorage';
import { appendRecordedTrack, createStudioProject } from '../storage/studioProjectsStorage';
import type { InstrumentId, SavedRecording } from '../types/recording';

// The whole app, engines and storage included, on fake native modules: see
// src/testing/nativeFakes.ts. What this catches is what tsc and unit tests
// cannot — a screen that throws when it renders, a press handler that throws,
// a hook-order or render-loop bug, cleanup that throws on the way out.

// SMOKE_OS=android runs every scenario down the Android branches (folder
// picker, navigation bar, ...); CI runs both.
jest.mock('react-native/Libraries/Utilities/Platform', () => {
  const actual = jest.requireActual('react-native/Libraries/Utilities/Platform');
  if (process.env.SMOKE_OS !== 'android') {
    return actual;
  }
  return {
    __esModule: true,
    default: {
      ...actual.default,
      OS: 'android',
      Version: 36,
      select: (spec: Record<string, unknown>) =>
        'android' in spec ? spec.android : 'native' in spec ? spec.native : spec.default,
    },
  };
});
jest.mock('react-native-audio-api/lib/module/core/AudioContext', () => ({
  __esModule: true,
  default: jest.requireActual('../testing/nativeFakes').FakeAudioContext,
}));
jest.mock('react-native-audio-api/lib/module/core/OfflineAudioContext', () => ({
  __esModule: true,
  default: jest.requireActual('../testing/nativeFakes').FakeOfflineAudioContext,
}));
jest.mock('react-native-audio-api/lib/module/system/AudioManager', () => ({
  __esModule: true,
  default: jest.requireActual('../testing/nativeFakes').FakeAudioManager,
}));
jest.mock('expo-audio', () => {
  const fakes = jest.requireActual('../testing/nativeFakes');
  return {
    createAudioPlayer: () => fakes.fakeAudioPlayer(),
    useAudioRecorder: () => fakes.fakeAudioRecorder(),
    useAudioRecorderState: () => ({ isRecording: false, durationMillis: 0, canRecord: true }),
    setAudioModeAsync: async () => undefined,
    setIsAudioActiveAsync: async () => undefined,
    requestRecordingPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
    getRecordingPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
    AudioModule: {
      requestRecordingPermissionsAsync: async () => ({ granted: true, status: 'granted' }),
    },
    RecordingPresets: { HIGH_QUALITY: {}, LOW_QUALITY: {} },
  };
});
jest.mock('expo-file-system', () => {
  const fakes = jest.requireActual('../testing/nativeFakes');
  return { File: fakes.FakeFile, Directory: fakes.FakeDirectory, Paths: fakes.FakePaths };
});
jest.mock('expo-screen-orientation', () => ({
  Orientation: { UNKNOWN: 0, PORTRAIT_UP: 1, PORTRAIT_DOWN: 2, LANDSCAPE_LEFT: 3, LANDSCAPE_RIGHT: 4 },
  OrientationLock: { DEFAULT: 0, ALL: 1, PORTRAIT: 2, PORTRAIT_UP: 3, LANDSCAPE: 5 },
  lockAsync: async () => undefined,
  getOrientationAsync: async () => 3,
  addOrientationChangeListener: () => ({ remove: () => {} }),
}));
jest.mock('expo-navigation-bar', () => ({ setStyle: () => {}, NavigationBar: () => null }));
jest.mock('expo-system-ui', () => ({ setBackgroundColorAsync: async () => undefined }));
jest.mock('expo-notifications', () => ({
  AndroidImportance: { DEFAULT: 3 },
  SchedulableTriggerInputTypes: { DAILY: 'daily' },
  setNotificationHandler: () => {},
  setNotificationChannelAsync: async () => undefined,
  getPermissionsAsync: async () => ({ granted: false, status: 'undetermined' }),
  requestPermissionsAsync: async () => ({ granted: false, status: 'denied' }),
  scheduleNotificationAsync: async () => 'id',
  cancelScheduledNotificationAsync: async () => undefined,
}));
jest.mock('expo-haptics', () => ({
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium', Rigid: 'rigid', Soft: 'soft' },
  impactAsync: async () => undefined,
  selectionAsync: async () => undefined,
}));
jest.mock('expo-sharing', () => ({
  isAvailableAsync: async () => false,
  shareAsync: async () => undefined,
}));
jest.mock('expo-application', () => ({
  nativeApplicationVersion: '1.1.0',
  nativeBuildVersion: '1',
}));
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: async () => ({ type: 'cancel' }),
  openBrowserAsync: async () => ({ type: 'cancel' }),
}));
jest.mock('expo-apple-authentication', () => ({
  AppleAuthenticationButton: () => null,
  AppleAuthenticationButtonStyle: { WHITE: 0 },
  AppleAuthenticationButtonType: { CONTINUE: 0 },
  AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 },
  isAvailableAsync: async () => false,
  signInAsync: async () => ({}),
}));
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: () => {},
    hasPlayServices: async () => true,
    signIn: async () => ({ type: 'cancelled' }),
    signOut: async () => undefined,
  },
  isErrorWithCode: () => false,
  statusCodes: {},
}));
jest.mock('@supabase/supabase-js', () => {
  // Read by src/supabase/client.ts right after this import, so launch takes the
  // same path a store build does instead of the 'not configured' shortcut.
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://smoke-test.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'smoke-test-key';
  return { createClient: () => jest.requireActual('../testing/nativeFakes').fakeSupabaseClient() };
});
jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('@expo/vector-icons/Ionicons', () => {
  const Icon = () => null;
  Icon.glyphMap = new Proxy({}, { has: () => true });
  return { __esModule: true, default: Icon };
});
jest.mock('react-native-safe-area-context', () => {
  const { createElement: h, Fragment } = jest.requireActual('react');
  const insets = { top: 0, bottom: 0, left: 0, right: 0 };
  const frame = { x: 0, y: 0, width: 844, height: 390 };
  const reactNative = jest.requireActual('react-native');
  const context = jest.requireActual('react').createContext(insets);
  return {
    SafeAreaProvider: ({ children }: { children: unknown }) => h(Fragment, null, children),
    SafeAreaInsetsContext: context,
    SafeAreaFrameContext: jest.requireActual('react').createContext(frame),
    SafeAreaView: reactNative.View,
    useSafeAreaInsets: () => insets,
    useSafeAreaFrame: () => frame,
    initialWindowMetrics: { insets, frame },
  };
});

const LANDSCAPE = { width: 844, height: 390, scale: 3, fontScale: 1 };
const PORTRAIT = { width: 390, height: 844, scale: 3, fontScale: 1 };

function setWindow(size: typeof LANDSCAPE) {
  act(() => {
    Dimensions.set({ window: size, screen: size });
  });
}

/** Lets promises, effects and a stretch of the fake clock run. */
async function settle(ms = 400) {
  await act(async () => {
    await jest.advanceTimersByTimeAsync(ms);
  });
}

/** What a crash looks like from outside, whichever way it surfaced. */
const CRASH =
  /TypeError|ReferenceError|RangeError|is not a function|Cannot read|undefined is not|Maximum update depth|Too many re-renders|Rendered (more|fewer) hooks|Invalid hook call|error occurred in|Objects are not valid as a React child/;

let problems: string[] = [];

function report(source: string, value: unknown) {
  const text = value instanceof Error ? `${value.name}: ${value.message}` : String(value);
  problems.push(`${source}: ${text.slice(0, 400)}`);
}

function textOf(node: ReactTestInstance | string): string {
  return typeof node === 'string' ? node : node.children.map(textOf).join(' ');
}

const isHostText = (node: ReactTestInstance) => node.type === 'Text';

function pressables(root: ReactTestInstance): ReactTestInstance[] {
  return root.findAll(
    (node) => typeof node.type !== 'string' && typeof node.props.onPress === 'function',
  );
}

const TOUCH = {
  identifier: 1,
  pageX: 120,
  pageY: 140,
  locationX: 20,
  locationY: 20,
  timestamp: 1000,
};
const touchEvent = () => ({
  nativeEvent: { ...TOUCH, touches: [TOUCH], changedTouches: [TOUCH] },
  persist: () => {},
  stopPropagation: () => {},
  preventDefault: () => {},
  currentTarget: 1,
  target: 1,
});

/**
 * Presses everything on the current screen once, re-reading the tree each time,
 * since a press can open a modal or replace the whole view. Back-out and
 * destructive controls are left alone so the pass stays on this screen.
 */
async function pressEverything(root: ReactTestInstance, limit = 60) {
  const seen = new Set<string>();
  for (let round = 0; round < limit; round += 1) {
    const next = pressables(root).find((node) => {
      const label = `${node.props.accessibilityLabel ?? ''} ${textOf(node)}`.trim();
      return !seen.has(label) && label.length > 0;
    });
    if (!next) {
      return seen.size;
    }
    const label = `${next.props.accessibilityLabel ?? ''} ${textOf(next)}`.trim();
    seen.add(label);
    if (/back|geri|zurück|delete|sil|lösch|sign out|çıkış|abmeld/i.test(label)) {
      continue;
    }
    try {
      await act(async () => {
        await next.props.onPress(touchEvent());
      });
      await settle(150);
    } catch (error) {
      report(`press "${label.slice(0, 60)}"`, error);
    }
  }
  return seen.size;
}

/**
 * Plays the surface: every key, string, pad and drum takes a touch down and up.
 * Keyboards and fretboards read raw touches rather than presses, so a press
 * pass alone would never reach the engines' note path.
 */
async function playEverything(root: ReactTestInstance, limit = 80) {
  const down = ['onPressIn', 'onTouchStart', 'onResponderGrant'];
  const up = ['onPressOut', 'onTouchEnd', 'onResponderRelease'];
  const surfaces = root
    .findAll((node) => typeof node.type !== 'string' && down.some((key) => node.props[key]))
    .slice(0, limit);
  for (const node of surfaces) {
    for (const key of [...down, ...up]) {
      let handler: unknown;
      try {
        handler = node.props[key];
      } catch {
        // An earlier touch took this node off screen; that is not a crash.
        break;
      }
      if (typeof handler === 'function') {
        try {
          await act(async () => {
            await (handler as (event: unknown) => unknown)(touchEvent());
          });
        } catch (error) {
          report(`${key}`, error);
        }
      }
    }
  }
  await settle(300);
  return surfaces.length;
}

/** One finished take per instrument, shaped as 1.0.0 saved them and as 1.1.0 does. */
function seedTake(instrument: InstrumentId, soundIds: string[], extra: Partial<SavedRecording> = {}) {
  return saveRecording({
    id: `take-${instrument}`,
    createdAt: Date.now(),
    instrument,
    mode: 'instrument',
    durationMs: 2000,
    title: `Take ${instrument}`,
    events: soundIds.map((soundId, i) => ({ soundId, atMs: i * 300, velocity: 0.8 })),
    ...extra,
  });
}

const SEEDS: [InstrumentId, string[], Partial<SavedRecording>][] = [
  ['piano', ['C4', 'E4', 'G4'], { pianoVoiceId: 'musicBox' }],
  ['drums', ['kick', 'hihatOpen', 'hihatClosed', 'snare'], { drumKitId: 'acoustic' }],
  ['guitar', [formatPluckSoundId('s1', 3), formatChordSoundId('C')], {}],
  ['violin', ['v1:0', 'v2:2'], {}],
  ['pads', ['pad01', 'pad04', 'pad05'], { padBankId: 'drums' }],
];

/**
 * Jest has no layout pass, so nothing ever calls onLayout — and keyboards,
 * fretboards and the timeline draw nothing until they know their size. Without
 * this the surfaces the app exists for would never be rendered at all.
 */
async function fireLayouts(root: ReactTestInstance) {
  const size = Dimensions.get('window');
  for (let pass = 0; pass < 3; pass += 1) {
    const measured = root.findAll((node) => typeof node.props.onLayout === 'function');
    await act(async () => {
      for (const node of measured) {
        try {
          node.props.onLayout({
            nativeEvent: {
              layout: { x: 0, y: 0, width: size.width, height: Math.round(size.height * 0.7) },
            },
          });
        } catch (error) {
          if (!/unmounted/.test(String(error))) {
            report('onLayout', error);
          }
        }
      }
    });
    await settle(50);
  }
}

async function mount(element: ReactElement) {
  const view = tree(element);
  await settle(1500);
  await fireLayouts(view.root);
  return view;
}

function tree(element: ReactElement) {
  let renderer!: ReactTestRenderer;
  act(() => {
    renderer = create(element);
  });
  return renderer;
}

function routed(state: InitialState) {
  return (
    <SafeAreaProvider>
      <NavigationContainer initialState={state}>
        <RootNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

function stateFor(tab: string, screen: string, params?: object): InitialState {
  return {
    index: 0,
    routes: [{ name: tab, state: { index: 0, routes: [{ name: screen, params }] } }],
  } as unknown as InitialState;
}

beforeAll(async () => {
  jest.useFakeTimers();
  jest.setSystemTime(new Date('2026-11-06T12:00:00Z'));
  await initI18n();
});

afterAll(() => {
  jest.useRealTimers();
});

beforeEach(async () => {
  problems = [];
  await AsyncStorage.clear();
  // The settings pass presses the language picker along with everything else.
  await changeLanguage('en');
  jest.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    const line = args.map(String).join(' ');
    if (CRASH.test(line)) {
      report('console.error', line);
    }
  });
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
  // The RN jest setup's openURL returns undefined; the real one is a Promise.
  jest.spyOn(Linking, 'openURL').mockImplementation(async () => true);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('the platform under test', () => {
  it('is the one this run asked for', () => {
    expect(Platform.OS).toBe(process.env.SMOKE_OS === 'android' ? 'android' : 'ios');
  });
});

describe('booting the app', () => {
  it('reaches the first screen as a new user, and into the app as a guest', async () => {
    setWindow(PORTRAIT);
    const app = tree(createElement(App));
    await settle(5000);

    const words = () => textOf(app.root as unknown as ReactTestInstance);
    expect(words().length).toBeGreaterThan(0);
    expect(app.root.findAll(isHostText).length).toBeGreaterThan(0);

    // First run: pick a language, then continue as a guest.
    for (let step = 0; step < 4; step += 1) {
      const guest = pressables(app.root).find((node) => /guest|misafir|konuk|gast/i.test(textOf(node)));
      const forward = guest ?? pressables(app.root)[0];
      if (!forward) {
        break;
      }
      await act(async () => {
        await forward.props.onPress(touchEvent());
      });
      await settle(800);
      if (guest) {
        break;
      }
    }

    // The instrument list is up, whatever language it came up in.
    expect(words()).toMatch(/Piano|Piyano|Klavier/);
    expect(problems).toEqual([]);

    act(() => app.unmount());
    await settle();
    expect(problems).toEqual([]);
  });

  it('survives every launch step failing', async () => {
    setWindow(PORTRAIT);
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage down'));
    const app = tree(createElement(App));
    await settle(5000);
    expect(app.toJSON()).not.toBeNull();
    expect(problems).toEqual([]);
    act(() => app.unmount());
  });
});

describe.each([
  ['Piano', 'Instruments', 'Piano'],
  ['Drums', 'Instruments', 'Drums'],
  ['Drum Machine', 'Instruments', 'DrumMachine'],
  ['Guitar', 'Instruments', 'Guitar'],
  ['Violin', 'Instruments', 'Violin'],
  ['Pads', 'Instruments', 'Pads'],
])('%s screen', (_name, tab, screen) => {
  it('renders and survives every control, in landscape and portrait', async () => {
    setWindow(LANDSCAPE);
    const view = await mount(routed(stateFor(tab, screen)));
    expect(problems).toEqual([]);

    const played = await playEverything(view.root);
    expect(played).toBeGreaterThan(0);
    expect(problems).toEqual([]);

    const pressed = await pressEverything(view.root);
    expect(pressed).toBeGreaterThan(0);
    expect(problems).toEqual([]);

    // A tablet that ignores the lock: the overlay takes over, nothing throws.
    setWindow(PORTRAIT);
    await settle();
    setWindow(LANDSCAPE);
    await settle();
    expect(problems).toEqual([]);

    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  });
});

describe.each([
  ['Instrument list', 'Instruments', 'InstrumentsList'],
  ['Recordings', 'Recordings', 'RecordingsHome'],
  ['Profile', 'Profile', 'ProfileHome'],
  ['Profile settings', 'Profile', 'ProfileSettings'],
])('%s screen', (_name, tab, screen) => {
  it('renders and survives its controls', async () => {
    setWindow(PORTRAIT);
    const view = await mount(routed(stateFor(tab, screen)));
    expect(problems).toEqual([]);
    await pressEverything(view.root);
    expect(problems).toEqual([]);
    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  });
});

describe('Studio project screen', () => {
  it('renders and survives its controls', async () => {
    setWindow(LANDSCAPE);
    const project = await createStudioProject('Smoke');
    for (const [instrument, soundIds, extra] of SEEDS) {
      await seedTake(instrument, soundIds, extra);
      await appendRecordedTrack(project.id, {
        id: `take-${instrument}`,
        createdAt: Date.now(),
        instrument,
        mode: 'instrument',
        durationMs: 2000,
        events: soundIds.map((soundId, i) => ({ soundId, atMs: i * 300 })),
        ...extra,
      });
    }
    const view = await mount(
      routed(stateFor('Recordings', 'StudioProject', { projectId: project.id })),
    );
    expect(problems).toEqual([]);
    await pressEverything(view.root);
    expect(problems).toEqual([]);
    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  });
});

describe("Great Fairy's Fountain, played as a real lesson", () => {
  const excerpt = greatFairyFountainSong.events.filter(
    (event) =>
      event.role !== 'accompaniment' &&
      event.atMs <= greatFairyFountainSong.partialWindowMs!.endMs,
  );

  async function pressText(view: ReactTestRenderer, pattern: RegExp) {
    const matches = pressables(view.root).filter((node) =>
      pattern.test(`${node.props.accessibilityLabel ?? ''} ${textOf(node)}`),
    );
    expect({ pattern: String(pattern), found: matches.length > 0 }).toEqual({
      pattern: String(pattern),
      found: true,
    });
    await act(async () => {
      await matches[matches.length - 1].props.onPress(touchEvent());
    });
    await settle(300);
  }

  async function openLesson(view: ReactTestRenderer) {
    await pressText(view, /Tutorial/);
    await pressText(view, /Great Fairy/);
    await pressText(view, /Continue with a part/);
  }

  /** The keyboard's own callback — what a finger on a key ends up calling. */
  async function playKey(view: ReactTestRenderer, noteId: string) {
    const keyboard = view.root.findAll(
      (node) => typeof node.props.onNotePressIn === 'function',
    )[0];
    await act(async () => {
      keyboard.props.onNotePressIn(noteId);
      keyboard.props.onNotePressOut?.(noteId);
    });
  }

  const screenText = (view: ReactTestRenderer) => textOf(view.root).replace(/\s+/g, ' ');

  it('demo: plays by itself and returns to the level choice', async () => {
    setWindow(LANDSCAPE);
    const view = await mount(routed(stateFor('Instruments', 'Piano')));
    await openLesson(view);
    await pressText(view, /Watch first/);
    await settle(1000);
    expect(screenText(view)).toMatch(/the song is playing for you/);

    await settle(40_000);
    expect(screenText(view)).not.toMatch(/the song is playing for you/);
    expect(problems).toEqual([]);

    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  }, 60_000);

  it('step by step: every right key scores 100% and three stars', async () => {
    setWindow(LANDSCAPE);
    const view = await mount(routed(stateFor('Instruments', 'Piano')));
    await openLesson(view);
    await pressText(view, /Step by step/);
    await settle(5000);

    for (const event of excerpt) {
      await playKey(view, event.noteId);
      await settle(50);
    }
    await settle(3000);

    expect(screenText(view)).toMatch(/Song finished!/);
    expect(screenText(view)).toMatch(/Accuracy: 100%/);
    expect(problems).toEqual([]);

    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  }, 60_000);

  it('no support: on-time playing scores well', async () => {
    setWindow(LANDSCAPE);
    const view = await mount(routed(stateFor('Instruments', 'Piano')));
    await openLesson(view);
    await pressText(view, /No support/);

    // The clock starts when the countdown ends.
    for (let i = 0; i < 100 && /Get ready/.test(screenText(view)); i += 1) {
      await settle(50);
    }
    const started = Date.now();
    for (const event of excerpt) {
      const wait = started + event.atMs - Date.now();
      if (wait > 0) {
        await settle(wait);
      }
      await playKey(view, event.noteId);
    }
    await settle(5000);

    const text = screenText(view);
    expect(text).toMatch(/Song finished!/);
    const accuracy = Number(/Accuracy: (\d+)%/.exec(text)?.[1]);
    expect(accuracy).toBeGreaterThanOrEqual(90);
    expect(problems).toEqual([]);

    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  }, 60_000);

  it('credits the practice time once, for the session it was played in', async () => {
    setWindow(LANDSCAPE);
    const view = await mount(routed(stateFor('Instruments', 'Piano')));
    await openLesson(view);
    await pressText(view, /Step by step/);
    await settle(5000);
    for (const event of excerpt) {
      await playKey(view, event.noteId);
      await settle(100);
    }
    await settle(3000);
    act(() => view.unmount());
    await settle(35_000);

    const progress = await loadProfileProgress();
    const practised = getPracticeMsForDay(progress, todayKey(), 'piano');
    // About the time the lesson took — not double it, and not nothing.
    expect(practised).toBeGreaterThan(0);
    expect(practised).toBeLessThan((excerpt.length * 100 + 10_000) * 1.5);
  }, 60_000);
});

describe('saved takes', () => {
  it('play and export for every instrument, without a crash or a stuck spinner', async () => {
    setWindow(PORTRAIT);
    for (const [instrument, soundIds, extra] of SEEDS) {
      await seedTake(instrument, soundIds, extra);
    }
    const view = await mount(routed(stateFor('Recordings', 'RecordingsHome')));
    expect(textOf(view.root)).toMatch(/Take piano/);

    // Every card's own controls: the dedupe in pressEverything would stop at
    // the first card, since all five carry the same labels.
    const cardControls = () =>
      pressables(view.root).filter((node) =>
        /play|oynat|çal|abspielen|wiedergabe|share|paylaş|teilen|download|indir|herunterladen/i.test(
          `${node.props.accessibilityLabel ?? ''} ${textOf(node)}`,
        ),
      );
    const count = cardControls().length;
    expect(count).toBeGreaterThanOrEqual(5);
    for (let i = 0; i < count; i += 1) {
      const control = cardControls()[i];
      if (!control) {
        break;
      }
      await act(async () => {
        await control.props.onPress(touchEvent());
      });
      await settle(4000);
    }
    await settle(10_000);
    expect(problems).toEqual([]);

    // Not merely "did not crash": the pipeline really rendered and encoded.
    const mp3s = writtenFiles().filter((file) => /.mp3$/.test(file.uri));
    expect(mp3s.length).toBeGreaterThan(0);
    for (const file of mp3s) {
      expect(file.size).toBeGreaterThan(0);
    }

    act(() => view.unmount());
    await settle(1000);
    expect(problems).toEqual([]);
  }, 180_000);
});
