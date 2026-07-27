// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

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
    ],
  },
]);
