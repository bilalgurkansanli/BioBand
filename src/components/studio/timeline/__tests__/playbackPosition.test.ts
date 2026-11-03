import { createPlaybackPosition } from '../playbackPosition';

describe('createPlaybackPosition', () => {
  it('starts where it is told to and reports what was set', () => {
    const position = createPlaybackPosition(250);
    expect(position.get()).toBe(250);
    position.set(1200);
    expect(position.get()).toBe(1200);
  });

  it('notifies subscribers of a move, and only of a move', () => {
    const position = createPlaybackPosition();
    const listener = jest.fn();
    position.subscribe(listener);

    position.set(100);
    position.set(100);
    position.set(200);

    // The repeated 100 is not a change — redrawing the playhead for it would
    // be exactly the waste the store exists to avoid.
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('stops notifying once unsubscribed', () => {
    const position = createPlaybackPosition();
    const listener = jest.fn();
    const unsubscribe = position.subscribe(listener);

    unsubscribe();
    position.set(500);

    expect(listener).not.toHaveBeenCalled();
  });
});
