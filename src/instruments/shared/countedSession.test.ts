import { resolveDrumPlaySession } from '../drums/songs/resolvePlaySession';
import { resolveGuitarPlaySession } from '../guitar/songs/resolvePlaySession';
import { FALLBACK_PARTIAL_COUNT, PARTIAL_TAIL_MS, resolveCountedSession } from './countedSession';

const events = Array.from({ length: 20 }, (_, i) => ({ atMs: i * 500 }));
const backing = { uri: 'file:///mix.mp3', eventsStartMs: 3000 };

describe('resolveCountedSession', () => {
  it('full scope plays the whole chart', () => {
    const session = resolveCountedSession({ events, backingTrack: backing }, 'fullBand', 'full');
    expect(session).toEqual({ events, scope: 'full', useBacking: true, audioStartMs: 3000 });
  });

  it('partial scope takes the first partialCount events and plays on after the last', () => {
    const session = resolveCountedSession(
      { events, partialCount: 4, backingTrack: backing },
      'fullBand',
      'partial',
    );
    expect(session.events).toEqual(events.slice(0, 4));
    expect(session.audioEndMs).toBe(3000 + 1500 + PARTIAL_TAIL_MS);
  });

  it('falls back to the first few events, and has no end without backing', () => {
    const session = resolveCountedSession({ events }, 'guitar', 'partial');
    expect(session.events).toHaveLength(FALLBACK_PARTIAL_COUNT);
    expect(session.useBacking).toBe(false);
    expect(session.audioEndMs).toBeUndefined();
  });

  it('copes with an empty chart', () => {
    expect(resolveCountedSession({ events: [] }, 'fullBand', 'partial').events).toEqual([]);
  });

  it('is what the instrument resolvers return', () => {
    const song = { id: 's', title: 'S', difficulty: 'easy' as const, events: [], partialCount: 2 };
    expect(
      resolveGuitarPlaySession(
        { ...song, events: [{ soundId: 's1:f0', atMs: 0 }, { soundId: 's1:f1', atMs: 400 }] },
        'guitar',
        'partial',
      ).events,
    ).toHaveLength(2);
    expect(
      resolveDrumPlaySession(
        { ...song, events: [{ padId: 'kick', atMs: 0 }], backingTrack: backing },
        'fullBand',
        'partial',
      ).audioEndMs,
    ).toBe(3000 + PARTIAL_TAIL_MS);
  });
});
