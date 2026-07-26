import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

const STORAGE_KEY = '@bioband/crash-log.v1';

/** Newest first. Old entries fall off the end. */
const MAX_ENTRIES = 20;

/**
 * Stack traces can run to tens of kilobytes once a render tree is involved,
 * and AsyncStorage is not the place for that. The top of a stack is where the
 * cause lives; the tail is framework noise.
 */
const MAX_STACK_CHARS = 2400;
const MAX_COMPONENT_STACK_CHARS = 1200;

export type CrashSource =
  /** Thrown while React was rendering — caught by the error boundary. */
  | 'render'
  /** Reached the platform's global handler. */
  | 'uncaught'
  /** A promise rejected with nobody listening. */
  | 'promise';

export type CrashRecord = {
  id: string;
  at: number;
  source: CrashSource;
  name: string;
  message: string;
  stack?: string;
  componentStack?: string;
  /** Enough context to tell "works on my phone" apart from a real bug. */
  appVersion: string;
  platform: string;
};

function truncate(text: string | undefined, limit: number): string | undefined {
  if (!text) {
    return undefined;
  }
  return text.length > limit ? `${text.slice(0, limit)}\n… (${text.length - limit} more)` : text;
}

function describePlatform(): string {
  return `${Platform.OS} ${String(Platform.Version)}`;
}

function describeVersion(): string {
  const version = Application.nativeApplicationVersion ?? '?';
  const build = Application.nativeBuildVersion ?? '?';
  return `${version} (${build})`;
}

export function buildCrashRecord(
  error: unknown,
  source: CrashSource,
  componentStack?: string,
): CrashRecord {
  const asError = error instanceof Error ? error : undefined;
  return {
    // Date.now alone collides when a render error fires twice in a frame.
    id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    at: Date.now(),
    source,
    name: asError?.name ?? 'Error',
    message: asError?.message ?? String(error),
    stack: truncate(asError?.stack, MAX_STACK_CHARS),
    componentStack: truncate(componentStack, MAX_COMPONENT_STACK_CHARS),
    appVersion: describeVersion(),
    platform: describePlatform(),
  };
}

function isCrashRecord(value: unknown): value is CrashRecord {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const entry = value as CrashRecord;
  return (
    typeof entry.id === 'string' &&
    typeof entry.at === 'number' &&
    typeof entry.message === 'string'
  );
}

export async function loadCrashLog(): Promise<CrashRecord[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter(isCrashRecord) : [];
  } catch {
    return [];
  }
}

/**
 * Appends a crash. Never throws: this runs on the failure path, and a
 * diagnostics write that blows up would replace one crash with another.
 */
export async function appendCrash(record: CrashRecord): Promise<void> {
  try {
    const existing = await loadCrashLog();
    const next = [record, ...existing].slice(0, MAX_ENTRIES);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch (error) {
    console.warn('[crashLog] could not persist crash', error);
  }
}

export async function clearCrashLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[crashLog] could not clear crash log', error);
  }
}

/** One crash as plain text — what gets pasted into a bug report. */
export function formatCrash(record: CrashRecord): string {
  const when = new Date(record.at).toISOString();
  const lines = [
    `${record.name}: ${record.message}`,
    `when:     ${when}`,
    `source:   ${record.source}`,
    `app:      BioBand ${record.appVersion}`,
    `platform: ${record.platform}`,
  ];
  if (record.stack) {
    lines.push('', record.stack);
  }
  if (record.componentStack) {
    lines.push('', 'Component stack:', record.componentStack);
  }
  return lines.join('\n');
}

export function formatCrashLog(records: CrashRecord[]): string {
  if (records.length === 0) {
    return 'BioBand — no errors recorded.';
  }
  return records
    .map((record, index) => `── ${index + 1}/${records.length} ──\n${formatCrash(record)}`)
    .join('\n\n');
}
