// Where a microphone overdub belongs on the project timeline.
//
// The beds (the project's existing tracks) start on the audio clock first,
// and the recorder immediately after them — but "immediately" still costs the
// native start call, and a mic take's time zero is the moment capture really
// began. Placed at 0, the take sat early against the beds by exactly that gap.
// The gap is measured here and becomes the new track's start offset.
//
// What cannot be measured from JavaScript — the hardware's own output and
// input latency, the round trip a singer hears and answers — is not included.
//
// Pure (clock readings in, milliseconds out), so it is unit-testable.

/** Anything longer is a measuring glitch, not a real start-up gap. */
export const MAX_CAPTURE_OFFSET_MS = 2000;

/**
 * How many milliseconds after the beds' start the recording's first sample
 * was captured.
 *
 * @param bedsStartContextTime audio-context time the beds started at
 * @param nowContextTime audio-context time read right after the recorder started
 * @param recordedSeconds how much the recorder says it has captured by then
 *   (expo-audio's `currentTime`; on Android this counts from the moment the
 *   native start call returned, which is the best estimate available there)
 */
export function captureOffsetMs(
  bedsStartContextTime: number,
  nowContextTime: number,
  recordedSeconds: number,
): number {
  const recorded =
    Number.isFinite(recordedSeconds) && recordedSeconds > 0 ? recordedSeconds : 0;
  const offsetMs = (nowContextTime - recorded - bedsStartContextTime) * 1000;
  if (!Number.isFinite(offsetMs)) {
    return 0;
  }
  return Math.round(Math.min(MAX_CAPTURE_OFFSET_MS, Math.max(0, offsetMs)));
}
