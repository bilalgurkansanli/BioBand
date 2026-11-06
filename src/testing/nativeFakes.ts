/**
 * In-memory stand-ins for the native side of the app, for the boot smoke test.
 *
 * Only the OS boundary is fake: engines, schedulers, hooks, storage modules and
 * screens all run for real on top of these, which is the point — a render-time
 * crash anywhere in that stack surfaces in Jest rather than on a user's phone.
 */

const noop = () => {};

// --- Web Audio -----------------------------------------------------------------

const PARAM_NAMES = new Set([
  'gain',
  'frequency',
  'detune',
  'Q',
  'playbackRate',
  'pan',
  'delayTime',
  'offset',
  'threshold',
  'knee',
  'ratio',
  'attack',
  'release',
]);

function fakeParam() {
  const param = {
    value: 1,
    defaultValue: 1,
    setValueAtTime: () => param,
    linearRampToValueAtTime: () => param,
    exponentialRampToValueAtTime: () => param,
    setTargetAtTime: () => param,
    setValueCurveAtTime: () => param,
    cancelScheduledValues: () => param,
    cancelAndHoldAtTime: () => param,
  };
  return param;
}

/** Every AudioNode: known params are params, everything else is a no-op method. */
function fakeNode(context: unknown): Record<string | symbol, unknown> {
  const fields: Record<string | symbol, unknown> = {
    context,
    connect: (target: unknown) => target,
    disconnect: noop,
    buffer: null,
    curve: null,
    loop: false,
    onEnded: null,
    onended: null,
  };
  return new Proxy(fields, {
    get(target, prop) {
      if (prop in target) {
        return target[prop];
      }
      if (typeof prop === 'symbol' || prop === 'then') {
        return undefined;
      }
      if (PARAM_NAMES.has(prop)) {
        target[prop] = fakeParam();
        return target[prop];
      }
      return noop;
    },
    set(target, prop, value) {
      target[prop] = value;
      return true;
    },
  });
}

export function fakeAudioBuffer(sampleRate = 48000, seconds = 1, channels = 2) {
  const length = Math.round(sampleRate * seconds);
  const data = Array.from({ length: channels }, () => new Float32Array(length));
  return {
    sampleRate,
    length,
    duration: seconds,
    numberOfChannels: channels,
    getChannelData: (channel: number) => data[channel],
    copyFromChannel: noop,
    copyToChannel: noop,
  };
}

class FakeBaseContext {
  sampleRate = 48000;
  state = 'running';
  destination: unknown = fakeNode(this);

  get currentTime(): number {
    // Follows Jest's fake clock, so schedulers see time pass.
    return Date.now() / 1000;
  }

  decodeAudioData = async () => fakeAudioBuffer(this.sampleRate);
  decodePCMInBase64 = async () => fakeAudioBuffer(this.sampleRate);
  createBuffer = (channels: number, length: number, sampleRate: number) =>
    fakeAudioBuffer(sampleRate, length / sampleRate, channels);
  createPeriodicWave = () => ({});
  resume = async () => true;
  suspend = async () => true;
  close = async () => undefined;

  createGain = () => fakeNode(this);
  createBufferSource = () => fakeNode(this);
  createOscillator = () => fakeNode(this);
  createBiquadFilter = () => fakeNode(this);
  createWaveShaper = () => fakeNode(this);
  createStereoPanner = () => fakeNode(this);
  createDelay = () => fakeNode(this);
  createDynamicsCompressor = () => fakeNode(this);
  createAnalyser = () => fakeNode(this);
  createConstantSource = () => fakeNode(this);
}

export class FakeAudioContext extends FakeBaseContext {}

export class FakeOfflineAudioContext extends FakeBaseContext {
  private readonly rendered: ReturnType<typeof fakeAudioBuffer>;

  constructor(channels = 2, length = 48000, sampleRate = 48000) {
    super();
    this.sampleRate = sampleRate;
    this.rendered = fakeAudioBuffer(sampleRate, length / sampleRate, channels);
  }

  startRendering = async () => this.rendered;
}

export const FakeAudioManager = {
  setAudioSessionOptions: noop,
  setAudioSessionActivity: async () => true,
  observeAudioInterruptions: noop,
  getDevicePreferredSampleRate: () => 48000,
};

// --- expo-audio ------------------------------------------------------------------

export function fakeAudioPlayer() {
  return {
    play: noop,
    pause: noop,
    remove: noop,
    release: noop,
    seekTo: async () => undefined,
    setPlaybackRate: noop,
    addListener: () => ({ remove: noop }),
    currentTime: 0,
    duration: 10,
    playing: false,
    isLoaded: true,
    loop: false,
    volume: 1,
    playbackRate: 1,
    shouldCorrectPitch: true,
  };
}

export function fakeAudioRecorder() {
  return {
    uri: null,
    isRecording: false,
    currentTime: 0,
    prepareToRecordAsync: async () => undefined,
    record: noop,
    stop: async () => undefined,
    pause: noop,
    getStatus: () => ({ canRecord: true, isRecording: false, durationMillis: 0 }),
  };
}

// --- expo-file-system ------------------------------------------------------------

const memoryFiles = new Map<string, Uint8Array>();
const memoryDirectories = new Set<string>();

/** What the app has written so far, for asserting an export really produced a file. */
export function writtenFiles(): { uri: string; size: number }[] {
  return [...memoryFiles].map(([uri, bytes]) => ({ uri, size: bytes.length }));
}

function joinParts(parts: unknown[]): string {
  return parts
    .map((part) =>
      typeof part === 'string' ? part : ((part as { uri?: string } | null)?.uri ?? ''),
    )
    .join('/')
    .replace(/([^:])\/+/g, '$1/');
}

export class FakeFile {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = joinParts(parts);
  }

  get exists() {
    return memoryFiles.has(this.uri);
  }
  get size() {
    return memoryFiles.get(this.uri)?.length ?? 0;
  }
  get name() {
    return this.uri.split('/').pop() ?? '';
  }
  create() {
    memoryFiles.set(this.uri, new Uint8Array());
  }
  delete() {
    memoryFiles.delete(this.uri);
  }
  write(content: string | Uint8Array) {
    memoryFiles.set(
      this.uri,
      typeof content === 'string' ? new TextEncoder().encode(content) : content,
    );
  }
  copySync(destination: FakeFile) {
    memoryFiles.set(destination.uri, memoryFiles.get(this.uri) ?? new Uint8Array());
  }
  async copy(destination: FakeFile) {
    this.copySync(destination);
  }
  async text() {
    return new TextDecoder().decode(memoryFiles.get(this.uri) ?? new Uint8Array());
  }
  async bytes() {
    return memoryFiles.get(this.uri) ?? new Uint8Array();
  }
  async base64() {
    return '';
  }
  info() {
    return { exists: this.exists, size: this.size, uri: this.uri };
  }
}

export class FakeDirectory {
  uri: string;

  constructor(...parts: unknown[]) {
    this.uri = joinParts(parts);
  }

  get exists() {
    return memoryDirectories.has(this.uri);
  }
  create() {
    memoryDirectories.add(this.uri);
  }
  delete() {
    memoryDirectories.delete(this.uri);
  }
  list() {
    return [];
  }
  static async pickDirectoryAsync() {
    throw new Error('canceled');
  }
}

export const FakePaths = {
  document: new FakeDirectory('file:///documents'),
  cache: new FakeDirectory('file:///cache'),
  bundle: new FakeDirectory('file:///bundle'),
  join: (...parts: string[]) => parts.join('/'),
};

// --- Supabase ----------------------------------------------------------------------

export function fakeSupabaseClient() {
  const query = {
    select: () => query,
    eq: () => query,
    upsert: async () => ({ data: null, error: null }),
    maybeSingle: async () => ({ data: null, error: null }),
    single: async () => ({ data: null, error: null }),
  };
  return {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: noop } } }),
      signInWithIdToken: async () => ({ data: { session: null }, error: null }),
      signOut: async () => ({ error: null }),
      setSession: async () => ({ data: { session: null }, error: null }),
      startAutoRefresh: async () => undefined,
      stopAutoRefresh: async () => undefined,
    },
    from: () => query,
    rpc: async () => ({ data: null, error: null }),
    functions: { invoke: async () => ({ data: null, error: null }) },
  };
}
