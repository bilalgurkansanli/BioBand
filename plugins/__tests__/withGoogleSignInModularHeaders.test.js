const { addModularHeaders, PODS } = require('../withGoogleSignInModularHeaders');

// Trimmed from the SDK 57 bare template, blank line above the target included —
// that blank line is what the old `\s*` indent pattern used to swallow.
const PODFILE = [
  "platform :ios, podfile_properties['ios.deploymentTarget'] || '16.4'",
  '',
  'prepare_react_native_project!',
  '',
  "target 'BioBand' do",
  '  use_expo_modules!',
  'end',
  '',
].join('\n');

describe('addModularHeaders', () => {
  it('declares each pod with modular headers directly under the app target', () => {
    const out = addModularHeaders(PODFILE);
    const lines = out.split('\n');
    const target = lines.indexOf("target 'BioBand' do");

    expect(lines[target + 1]).toMatch(/^ {2}# Added by withGoogleSignInModularHeaders/);
    PODS.forEach((pod, i) => {
      expect(lines[target + 2 + i]).toBe(`  pod '${pod}', :modular_headers => true`);
    });
    expect(lines[target + 2 + PODS.length]).toBe('  use_expo_modules!');
  });

  it('is idempotent', () => {
    const once = addModularHeaders(PODFILE);
    expect(addModularHeaders(once)).toBe(once);
  });

  it('fails loudly when the template has no target block', () => {
    expect(() => addModularHeaders('platform :ios, "16.4"\n')).toThrow(/Podfile template has changed/);
  });
});
