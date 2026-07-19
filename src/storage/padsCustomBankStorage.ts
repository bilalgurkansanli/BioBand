import AsyncStorage from '@react-native-async-storage/async-storage';
import { Directory, File, Paths } from 'expo-file-system';

import {
  createDefaultCustomPadSlots,
  isPadBankId,
  type CustomPadSlot,
  type CustomSlotSource,
  type PadChokeGroup,
} from '../instruments/pads/padsBanks';
import { PAD_SOUND_IDS, type PadSoundId } from '../instruments/pads/padsSounds';

const STORAGE_KEY = 'pads.customBank.v1';

const VALID_PAD_IDS = new Set<string>(PAD_SOUND_IDS);

function getPadSamplesDirectory(): Directory {
  const dir = new Directory(Paths.document, 'pad-samples');
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
  return dir;
}

/**
 * Copy a freshly recorded mic take into Documents so the pad sample survives
 * cache cleanup. Returns the durable URI.
 */
export function copyPadSampleFile(slotIndex: number, sourceUri: string): string {
  const dir = getPadSamplesDirectory();
  const ext = sourceUri.split('.').pop()?.toLowerCase() ?? 'm4a';
  const safeExt = /^[a-z0-9]{1,5}$/.test(ext) ? ext : 'm4a';
  // Timestamped name — never overwrite a file a still-cached buffer points at.
  const destination = new File(dir, `slot${slotIndex + 1}-${Date.now()}.${safeExt}`);
  new File(sourceUri).copy(destination);
  return destination.uri;
}

/** Best-effort delete of a replaced user sample file. */
export function deletePadSampleFile(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Ignore — orphaned files are harmless.
  }
}

function isChokeGroup(value: unknown): value is PadChokeGroup {
  return value === 'a' || value === 'b';
}

/**
 * User samples are persisted as bare file names, not absolute URIs — on iOS
 * the app container path changes on every update, which would strand every
 * absolute URI. Resolution back to a full URI happens at load.
 */
function toStoredUserUri(uri: string): string {
  const name = uri.split('/').pop();
  return name && uri.includes('pad-samples') ? name : uri;
}

function resolveStoredUserUri(stored: string): string {
  if (stored.includes('://') || stored.includes('/')) {
    // Legacy absolute URI — keep as-is (works until the container moves).
    return stored;
  }
  return new File(getPadSamplesDirectory(), stored).uri;
}

function parseSource(raw: unknown): CustomSlotSource | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const source = raw as Record<string, unknown>;
  if (source.kind === 'user' && typeof source.uri === 'string' && source.uri.length > 0) {
    return { kind: 'user', uri: resolveStoredUserUri(source.uri) };
  }
  if (
    source.kind === 'builtin' &&
    isPadBankId(source.bankId) &&
    source.bankId !== 'custom' &&
    typeof source.padId === 'string' &&
    VALID_PAD_IDS.has(source.padId)
  ) {
    return {
      kind: 'builtin',
      bankId: source.bankId,
      padId: source.padId as PadSoundId,
    };
  }
  return null;
}

function parseSlot(raw: unknown, fallback: CustomPadSlot): CustomPadSlot {
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const slot = raw as Record<string, unknown>;
  const source = parseSource(slot.source);
  if (!source) {
    return fallback;
  }
  return {
    source,
    color:
      typeof slot.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(slot.color)
        ? slot.color
        : fallback.color,
    gain:
      typeof slot.gain === 'number' && Number.isFinite(slot.gain)
        ? Math.max(0.2, Math.min(1.4, slot.gain))
        : 1,
    pitchSemitones:
      typeof slot.pitchSemitones === 'number' && Number.isFinite(slot.pitchSemitones)
        ? Math.max(-12, Math.min(12, Math.round(slot.pitchSemitones)))
        : 0,
    chokeGroup: isChokeGroup(slot.chokeGroup) ? slot.chokeGroup : undefined,
    label:
      typeof slot.label === 'string' && slot.label.trim().length > 0
        ? slot.label.trim().slice(0, 24)
        : undefined,
  };
}

export async function loadCustomPadSlots(): Promise<CustomPadSlot[]> {
  const defaults = createDefaultCustomPadSlots();
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaults;
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return defaults;
    }
    return defaults.map((fallback, index) => parseSlot(parsed[index], fallback));
  } catch {
    return defaults;
  }
}

export async function saveCustomPadSlots(slots: CustomPadSlot[]): Promise<void> {
  try {
    const storable = slots.map((slot) =>
      slot.source.kind === 'user'
        ? { ...slot, source: { kind: 'user', uri: toStoredUserUri(slot.source.uri) } }
        : slot,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(storable));
  } catch {
    // Ignore persistence failures — the in-memory bank still works.
  }
}
