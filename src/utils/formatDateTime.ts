/**
 * Date+time labels for saved takes and studio projects.
 *
 * i18next hands out short language codes ('tr', 'de', 'en'), and `Intl` needs a
 * full BCP 47 tag before it picks the right month names and day/month order —
 * mapping only Turkish left German readers looking at American dates.
 */

const LOCALE_TAGS: Record<string, string> = {
  de: 'de-DE',
  en: 'en-US',
  tr: 'tr-TR',
};

const FALLBACK_LOCALE_TAG = 'en-US';

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  month: 'short',
  year: 'numeric',
};

// Constructing the formatter is the expensive half of `Intl`, and a list of
// cards asks for the same one over and over — one instance per language lives
// for the app's lifetime instead.
const formatterCache = new Map<string, Intl.DateTimeFormat>();

/**
 * Region-qualified tags ('en-GB') and casing ('TR') both reach us from the
 * device locale, so match on the bare language subtag.
 */
function resolveTag(language: string): string {
  return LOCALE_TAGS[language.slice(0, 2).toLowerCase()] ?? FALLBACK_LOCALE_TAG;
}

function formatterFor(language: string): Intl.DateTimeFormat {
  const tag = resolveTag(language);
  const cached = formatterCache.get(tag);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat(tag, DATE_TIME_OPTIONS);
  formatterCache.set(tag, formatter);
  return formatter;
}

export function formatDateTime(timestampMs: number, language: string): string {
  return formatterFor(language).format(timestampMs);
}

const numberFormatterCache = new Map<string, Intl.NumberFormat>();

/**
 * Playback-speed label: "0,5" for Turkish and German readers, "0.5" for
 * English ones. It lives here to share the tag table above — the decimal
 * separator is exactly the kind of detail that silently goes wrong per locale
 * when each caller rolls its own.
 */
export function formatDecimal(value: number, language: string): string {
  const tag = resolveTag(language);
  const cached = numberFormatterCache.get(tag);
  if (cached) {
    return cached.format(value);
  }

  const formatter = new Intl.NumberFormat(tag, { maximumFractionDigits: 2 });
  numberFormatterCache.set(tag, formatter);
  return formatter.format(value);
}
