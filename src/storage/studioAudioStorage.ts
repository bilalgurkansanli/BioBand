import { Directory, File, Paths } from 'expo-file-system';

function getStudioAudioDirectory(projectId: string): Directory {
  const root = new Directory(Paths.document, 'studio-audio');
  if (!root.exists) {
    root.create({ intermediates: true, idempotent: true });
  }
  const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const dir = new Directory(root, safeProject);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function extensionFromUri(uri: string): string {
  const match = uri.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
  const ext = match?.[1]?.toLowerCase() ?? 'm4a';
  if (
    ext === 'm4a' ||
    ext === 'mp3' ||
    ext === 'wav' ||
    ext === 'aac' ||
    ext === 'caf' ||
    ext === 'mp4'
  ) {
    return ext;
  }
  return 'm4a';
}

/** Copy a mic take into Documents so Studio tracks survive cache cleanup. */
export function copyStudioTrackAudio(
  projectId: string,
  trackId: string,
  sourceUri: string,
): string {
  const dir = getStudioAudioDirectory(projectId);
  const ext = extensionFromUri(sourceUri);
  const safeTrack = trackId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const destination = new File(dir, `${safeTrack}.${ext}`);
  if (destination.exists) {
    destination.delete();
  }
  new File(sourceUri).copy(destination);
  return destination.uri;
}

export function deleteStudioTrackAudio(localUri: string): void {
  try {
    const file = new File(localUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup.
  }
}

export function deleteStudioProjectAudio(projectId: string): void {
  try {
    const root = new Directory(Paths.document, 'studio-audio');
    const safeProject = projectId.replace(/[^a-zA-Z0-9_-]/g, '_');
    const dir = new Directory(root, safeProject);
    if (dir.exists) {
      dir.delete();
    }
  } catch {
    // Best-effort cleanup.
  }
}
