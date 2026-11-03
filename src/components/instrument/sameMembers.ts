/**
 * True when two sets hold exactly the same values.
 *
 * The multi-touch instrument surfaces (keyboard, fretboard, fingerboard, pads)
 * recompute the set of held cells on every touch-move, which fires once a
 * frame. Storing a fresh but identical set re-renders the whole surface for
 * nothing, so they only commit a new one when this says it actually changed.
 */
export function hasSameMembers<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
  if (a === b) {
    return true;
  }
  if (a.size !== b.size) {
    return false;
  }
  for (const value of a) {
    if (!b.has(value)) {
      return false;
    }
  }
  return true;
}
