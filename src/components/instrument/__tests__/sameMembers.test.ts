import { hasSameMembers } from '../sameMembers';

describe('hasSameMembers', () => {
  it('treats sets with the same values as equal, whatever the order', () => {
    expect(hasSameMembers(new Set(['C4', 'E4']), new Set(['E4', 'C4']))).toBe(true);
    expect(hasSameMembers(new Set(), new Set())).toBe(true);
  });

  it('sees a value swapped for another one of the same count', () => {
    // The case that matters on a keyboard: one finger slides to the next key,
    // so the size stays put and only the contents change.
    expect(hasSameMembers(new Set(['C4', 'E4']), new Set(['C4', 'F4']))).toBe(false);
  });

  it('sees a value added or removed', () => {
    expect(hasSameMembers(new Set([1]), new Set([1, 2]))).toBe(false);
    expect(hasSameMembers(new Set([1, 2]), new Set([1]))).toBe(false);
  });
});
