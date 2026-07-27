const fs = require('fs');
const path = require('path');
const { withDangerousMod } = require('expo/config-plugins');

/**
 * Gives two of Google Sign-In's transitive pods modular headers.
 *
 * GoogleSignIn 9 pulls in `AppCheckCore`, which is Swift, which in turn depends
 * on `GoogleUtilities` and `RecaptchaInterop`, which are Objective-C and ship no
 * module map. CocoaPods cannot integrate a Swift pod against non-modular
 * dependencies while building as static libraries, so `pod install` stops with:
 *
 *   [!] The following Swift pods cannot yet be integrated as static libraries:
 *   The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *   `RecaptchaInterop`, which do not define modules.
 *
 * Expo already enables modular headers, but only for the pods its own modules
 * depend on *directly* (see expo-modules-autolinking's autolinking_manager.rb).
 * These two are a level deeper, so nothing reaches them.
 *
 * The narrow fix is preferred over `use_modular_headers!`, which turns it on for
 * every pod in the project, and over switching the whole build to static
 * frameworks — both change how unrelated native modules compile, and this app
 * has an audio module with vendored frameworks that has no reason to be
 * disturbed.
 */

const PODS = ['GoogleUtilities', 'RecaptchaInterop'];

const MARKER = '# Added by withGoogleSignInModularHeaders';

/** Matches the generated Podfile's app target, e.g. `target 'BioBand' do`. */
const TARGET_LINE = /^(\s*)target\s+['"][^'"]+['"]\s+do\s*$/m;

/**
 * Exported for the test alongside this file: the string edit is the whole risk
 * here, and it cannot be exercised on a machine that can't run an iOS prebuild.
 */
function addModularHeaders(podfile) {
  if (podfile.includes(MARKER)) {
    return podfile;
  }

  const match = podfile.match(TARGET_LINE);
  if (!match) {
    // Loud on purpose. Silently returning the file unchanged would turn a
    // template change into the same opaque `pod install` failure this exists to
    // prevent, fifteen minutes into a build.
    throw new Error(
      'withGoogleSignInModularHeaders: no `target \'…\' do` line in the Podfile, ' +
        'so there is nowhere to declare the pods. The Podfile template has changed.',
    );
  }

  const indent = `${match[1]}  `;
  const lines = [
    `${indent}${MARKER} — see plugins/withGoogleSignInModularHeaders.js`,
    ...PODS.map((pod) => `${indent}pod '${pod}', :modular_headers => true`),
  ].join('\n');

  return podfile.replace(TARGET_LINE, `${match[0]}\n${lines}`);
}

const withGoogleSignInModularHeaders = (config) =>
  withDangerousMod(config, [
    'ios',
    (cfg) => {
      const podfilePath = path.join(cfg.modRequest.platformProjectRoot, 'Podfile');
      const podfile = fs.readFileSync(podfilePath, 'utf8');
      fs.writeFileSync(podfilePath, addModularHeaders(podfile));
      return cfg;
    },
  ]);

module.exports = withGoogleSignInModularHeaders;
module.exports.addModularHeaders = addModularHeaders;
module.exports.PODS = PODS;
