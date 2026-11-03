import {
  isSafeRecordingId,
  MAX_BACKUP_AUDIO_BYTES,
  MAX_BACKUP_FILE_BYTES,
  sanitizeAudioBlob,
  sanitizeBackupEntry,
} from '../libraryBackupValidation';

const newId = () => 'generated-id';
const blob = { ext: 'm4a', base64: 'AAAA' };

function entry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '1730000000000',
    createdAt: 1730000000000,
    instrument: 'piano',
    mode: 'instrument',
    durationMs: 4000,
    events: [{ soundId: 'C4', atMs: 0 }],
    ...overrides,
  };
}

describe('isSafeRecordingId', () => {
  it.each(['1730000000000', 'dm-1730000000000', '1730000000000-3', 'restored-1-abc_d'])(
    'accepts the ids the app generates: %s',
    (id) => expect(isSafeRecordingId(id)).toBe(true),
  );

  it.each(['../../Documents/x', 'a/b', '..', '', 'x'.repeat(65), 'a.b', 'a b', 42])(
    'rejects anything that could reach outside its directory: %p',
    (id) => expect(isSafeRecordingId(id)).toBe(false),
  );
});

describe('sanitizeAudioBlob', () => {
  it('accepts the formats the app records, in any case', () => {
    expect(sanitizeAudioBlob({ ext: 'MP3', base64: 'AAAA' })).toEqual({ ext: 'mp3', base64: 'AAAA' });
  });

  it.each([
    { ext: 'sh', base64: 'AAAA' },
    { ext: 'm4a/../../x', base64: 'AAAA' },
    { ext: 'm4a', base64: '' },
    { ext: 'm4a', base64: 7 },
    { base64: 'AAAA' },
    'AAAA',
  ])('rejects %p', (value) => expect(sanitizeAudioBlob(value)).toBeNull());
});

describe('sanitizeBackupEntry', () => {
  it('passes a well-formed instrument take through', () => {
    expect(sanitizeBackupEntry(entry({ title: 'Etude', drumKitId: 'acoustic' }), {}, newId)).toEqual({
      recording: {
        id: '1730000000000',
        createdAt: 1730000000000,
        instrument: 'piano',
        mode: 'instrument',
        durationMs: 4000,
        events: [{ soundId: 'C4', atMs: 0 }],
        title: 'Etude',
        drumKitId: 'acoustic',
      },
      audio: null,
    });
  });

  it('replaces an id that would escape the restore directory', () => {
    const result = sanitizeBackupEntry(
      entry({ id: '../../Library/Preferences/x', mode: 'microphone', audioRef: 'a0' }),
      { a0: blob },
      newId,
    );
    expect(result?.recording.id).toBe('generated-id');
    expect(result?.audio).toEqual(blob);
  });

  it('never carries an incoming audioUri', () => {
    const result = sanitizeBackupEntry(
      entry({ mode: 'microphone', audioRef: 'a0', audioUri: 'file:///var/mobile/secret.db' }),
      { a0: blob },
      newId,
    );
    expect(result).not.toBeNull();
    expect(result?.recording).not.toHaveProperty('audioUri');
  });

  it('drops a take that points at external audio instead of carrying its own', () => {
    expect(
      sanitizeBackupEntry(entry({ mode: 'microphone', audioUri: 'file:///etc/hosts' }), {}, newId),
    ).toBeNull();
  });

  it('drops a take whose promised audio is missing or not an audio format', () => {
    expect(sanitizeBackupEntry(entry({ audioRef: 'a9' }), { a0: blob }, newId)).toBeNull();
    expect(
      sanitizeBackupEntry(entry({ audioRef: 'a0' }), { a0: { ext: 'exe', base64: 'AA' } }, newId),
    ).toBeNull();
  });

  it('does not follow an audio ref into the prototype', () => {
    expect(sanitizeBackupEntry(entry({ audioRef: '__proto__' }), {}, newId)).toBeNull();
    expect(sanitizeBackupEntry(entry({ audioRef: 'constructor' }), {}, newId)).toBeNull();
  });

  it('keeps a microphone take the export saved without audio', () => {
    // The export does this when the take's file had already gone missing.
    const result = sanitizeBackupEntry(entry({ mode: 'microphone', events: undefined }), {}, newId);
    expect(result?.recording.mode).toBe('microphone');
    expect(result?.audio).toBeNull();
  });

  it('drops entries that cannot be a take at all', () => {
    expect(sanitizeBackupEntry(null, {}, newId)).toBeNull();
    expect(sanitizeBackupEntry(entry({ instrument: 'theremin' }), {}, newId)).toBeNull();
    expect(sanitizeBackupEntry(entry({ mode: 'video' }), {}, newId)).toBeNull();
  });

  it('rebuilds every field from its type and drops unknown ones', () => {
    const result = sanitizeBackupEntry(
      entry({
        createdAt: 'yesterday',
        durationMs: -5,
        events: [
          { soundId: 'C4', atMs: 10, velocity: 3 },
          { soundId: 'D4', atMs: -1 },
          { soundId: 9, atMs: 0 },
          'junk',
        ],
        title: 'x'.repeat(500),
        source: 'malware',
        guitarVoiceId: 12,
        extra: { anything: true },
      }),
      {},
      newId,
    );
    expect(result?.recording.createdAt).toEqual(expect.any(Number));
    expect(result?.recording.durationMs).toBe(0);
    expect(result?.recording.events).toEqual([{ soundId: 'C4', atMs: 10, velocity: 1 }]);
    expect(result?.recording.title).toHaveLength(120);
    expect(result?.recording).not.toHaveProperty('source');
    expect(result?.recording).not.toHaveProperty('guitarVoiceId');
    expect(result?.recording).not.toHaveProperty('extra');
  });
});

describe('MAX_BACKUP_FILE_BYTES', () => {
  it('still fits the largest backup an export can produce', () => {
    // base64 grows the audio by a third; the rest is notes and metadata.
    expect(MAX_BACKUP_FILE_BYTES).toBeGreaterThan((MAX_BACKUP_AUDIO_BYTES * 4) / 3);
  });
});
