// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const globals = require('globals');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: [
      'dist/*',
      'android/*',
      'ios/*',
      // One-off sample-generation utilities, run by hand outside the app.
      'scripts/*',
      // Deno code running on Supabase's Edge runtime — different globals and
      // module resolution than the app.
      'supabase/functions/*',
      // Agent worktrees are whole copies of the repo.
      '.claude/**',
    ],
  },
  {
    rules: {
      // These three come from the React Compiler and exist to keep code safe
      // for it to rewrite. The compiler is not enabled here, and the patterns
      // they flag are deliberate: a "latest value" ref assigned during render
      // is how the audio callbacks read current settings without being
      // re-created on every tick. Revisit if the compiler is ever turned on.
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
    },
  },
  {
    files: ['**/__tests__/**', '**/*.test.{js,ts,tsx}'],
    languageOptions: { globals: globals.jest },
  },
]);
