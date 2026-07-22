export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/**
 * Formats a duration as whole hours/minutes (e.g. "1 st 30 dk" / "1 hr 30 min")
 * instead of a raw mm:ss clock — mm:ss reads as "impossible" once minutes
 * pass 59 for cumulative totals like a full day of practice.
 */
export function formatPracticeDuration(
  durationMs: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const totalMinutes = Math.max(0, Math.round(durationMs / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0) {
    return t('common.minutesShort', { count: minutes });
  }
  if (minutes === 0) {
    return t('common.hoursShort', { count: hours });
  }
  return `${t('common.hoursShort', { count: hours })} ${t('common.minutesShort', { count: minutes })}`;
}
