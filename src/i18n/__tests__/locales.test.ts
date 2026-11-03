// The scan reads the source tree from disk, so it needs Node's types — and
// tsconfig lists only jest's (TypeScript 6 no longer loads every @types
// package on its own).
/// <reference types="node" />
import * as fs from 'fs';
import * as path from 'path';

import de from '../locales/de.json';
import en from '../locales/en.json';
import tr from '../locales/tr.json';

/**
 * The three catalogues have to stay in step, and the code has to ask only for
 * keys that exist. A missing key does not crash: i18next quietly prints the key
 * itself ("studio.trackDelete") in the middle of the UI, and only in the
 * language that lacks it — nobody testing in English ever sees it.
 */

type Catalogue = Record<string, unknown>;

const LOCALES: Record<string, Catalogue> = { en, tr, de };

/** Leaf strings by dotted path. Arrays (returnObjects lists) flatten by index. */
function flatten(node: unknown, prefix = '', out = new Map<string, string>()) {
  if (node !== null && typeof node === 'object') {
    for (const [key, value] of Object.entries(node)) {
      flatten(value, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, String(node));
  }
  return out;
}

/** `{{count}}`, `{{ title }}`, `{{value, number}}` → the variable names. */
function interpolationVariables(text: string): string[] {
  const names = [...text.matchAll(/{{\s*([^}\s,]+)[^}]*}}/g)].map((match) => match[1]);
  return [...new Set(names)].sort();
}

const flat = Object.fromEntries(
  Object.entries(LOCALES).map(([language, catalogue]) => [language, flatten(catalogue)]),
);
const englishKeys = [...flat.en.keys()];

const PLURAL_SUFFIXES = ['_zero', '_one', '_two', '_few', '_many', '_other'];

/**
 * Whether `t(key)` resolves in English: the key itself, its plural forms
 * (`t('x', { count })` reads `x_one` / `x_other`), or a subtree read with
 * `returnObjects`.
 */
function englishHas(key: string): boolean {
  return (
    flat.en.has(key) ||
    PLURAL_SUFFIXES.some((suffix) => flat.en.has(`${key}${suffix}`)) ||
    englishKeys.some((existing) => existing.startsWith(`${key}.`))
  );
}

const ROOT = path.resolve(__dirname, '../../..');

function sourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') {
        sourceFiles(full, out);
      }
    } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.endsWith('.d.ts')) {
      out.push(full);
    }
  }
  return out;
}

const SOURCES = [...sourceFiles(path.join(ROOT, 'src')), path.join(ROOT, 'App.tsx')].map(
  (file) => ({ file: path.relative(ROOT, file), text: fs.readFileSync(file, 'utf8') }),
);

/** Every `t('a.b')` / `i18n.t("a.b")` with a literal key — template parts excluded. */
function staticTranslationKeys(text: string): string[] {
  return [...text.matchAll(/\bt\(\s*(['"`])([A-Za-z0-9_.-]+)\1/g)].map((match) => match[2]);
}

/**
 * Keys handed over as data rather than to `t` directly: `labelKey: 'x.y'`,
 * `titleKey="x.y"`, `descriptionKey: 'x.y'`. Song catalogues, pad banks and
 * menus all work this way, and a typo there is just as invisible.
 */
function dataTranslationKeys(text: string): string[] {
  return [...text.matchAll(/\b\w*Key\s*[:=]\s*['"]([a-z][A-Za-z0-9_]*(?:\.[A-Za-z0-9_-]+)+)['"]/g)].map(
    (match) => match[1],
  );
}

/**
 * `*Key` fields that no screen ever passes to `t`. The violin phrases carry a
 * `labelKey` but are only ever played, never listed, so their keys were never
 * added. Remove the entry the day a phrase name reaches the UI.
 */
const NEVER_RENDERED = ['violin.phrases.'];

describe('locale catalogues', () => {
  it.each(['tr', 'de'])('%s has exactly the keys English has', (language) => {
    const keys = [...flat[language].keys()];
    expect(keys.filter((key) => !flat.en.has(key))).toEqual([]);
    expect(englishKeys.filter((key) => !flat[language].has(key))).toEqual([]);
  });

  it.each(['tr', 'de'])('%s uses the same {{variables}} as English, key by key', (language) => {
    const mismatches = englishKeys
      .filter((key) => flat[language].has(key))
      .map((key) => ({
        key,
        english: interpolationVariables(flat.en.get(key) ?? ''),
        translated: interpolationVariables(flat[language].get(key) ?? ''),
      }))
      .filter((entry) => entry.english.join() !== entry.translated.join());
    expect(mismatches).toEqual([]);
  });
});

describe('keys used in the source', () => {
  it('finds the call sites it is meant to check', () => {
    // Guards the scan itself: a regex that silently matched nothing would
    // make the test below pass for the wrong reason.
    const found = SOURCES.flatMap(({ text }) => staticTranslationKeys(text));
    expect(found.length).toBeGreaterThan(500);
    expect(found).toContain('common.close');
  });

  it('every static t() key exists in en.json', () => {
    const missing = SOURCES.flatMap(({ file, text }) =>
      staticTranslationKeys(text)
        .filter((key) => !englishHas(key))
        .map((key) => `${file}: ${key}`),
    );
    expect(missing).toEqual([]);
  });

  it('every *Key string handed around as data exists in en.json', () => {
    const missing = SOURCES.flatMap(({ file, text }) =>
      dataTranslationKeys(text)
        .filter((key) => !englishHas(key) && !NEVER_RENDERED.some((prefix) => key.startsWith(prefix)))
        .map((key) => `${file}: ${key}`),
    );
    expect(missing).toEqual([]);
  });
});
