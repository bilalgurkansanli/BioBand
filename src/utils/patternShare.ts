import { Directory, File, Paths } from 'expo-file-system';

import type { DrumMachinePattern } from '../storage/drumMachinePatternsStorage';
import { pickDocument } from './documentPicker';

function getExportDirectory(): Directory {
  const dir = new Directory(Paths.cache, 'bioband-exports');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/** Optional — only works after a native rebuild that includes expo-sharing. */
async function tryExpoSharing() {
  try {
    const Sharing = await import('expo-sharing');
    if (await Sharing.isAvailableAsync()) {
      return Sharing;
    }
  } catch {
    // Native module missing in current dev client.
  }
  return null;
}

function safeFileName(title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9çğıöşü]+/gi, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 32);
  return `bioband-beat-${slug || 'pattern'}.json`;
}

/** Writes the pattern as a share file and opens the system share sheet. */
export async function shareDrumMachinePattern(
  pattern: DrumMachinePattern,
  dialogTitle: string,
): Promise<boolean> {
  const Sharing = await tryExpoSharing();
  if (!Sharing) {
    return false;
  }

  const destination = new File(getExportDirectory(), safeFileName(pattern.title));
  if (destination.exists) {
    destination.delete();
  }
  destination.create();
  destination.write(
    JSON.stringify(
      {
        format: 'bioband-beat-v1',
        pattern: {
          title: pattern.title,
          bpm: pattern.bpm,
          machineType: pattern.machineType,
          grid: pattern.grid,
        },
      },
      null,
      2,
    ),
  );

  await Sharing.shareAsync(destination.uri, {
    mimeType: 'application/json',
    dialogTitle,
  });
  return true;
}

export type PickBeatFileResult =
  | { ok: true; payload: unknown }
  | { ok: false; code: 'canceled' | 'pickerUnavailable' | 'invalid' };

/** Picks a beat share file and returns its parsed JSON payload. */
export async function pickDrumMachinePatternFile(): Promise<PickBeatFileResult> {
  const picked = await pickDocument(['application/json', '*/*']);
  if (!picked.ok) {
    return picked;
  }
  try {
    const text = await new File(picked.asset.uri).text();
    return { ok: true, payload: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, code: 'invalid' };
  }
}
