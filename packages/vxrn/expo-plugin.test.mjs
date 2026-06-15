import { describe, expect, it } from 'vitest'
import {
  addPodHermescToBundleReactNativeShellScript,
  addSetCliPathToBundleReactNativeShellScript,
  injectExpoUpdatesIosResourcesPatchIntoPodfile,
  injectHermesMinificationPatchIntoPodfile,
  injectSwift6WorkaroundIntoPodfile,
  EXPO_UPDATES_METRO_SKIP_MARKER,
  HERMES_MINIFY_PATCH_MARKER,
} from './expo-plugin.cjs'

// a minimal stand-in for the default Expo/RN "Bundle React Native code and
// images" phase: a backtick-wrapped `"$NODE_BINARY" ...` invocation, the anchor
// the bundle-phase patchers insert their exports before.
const sampleBundleScript = [
  'if [[ -f "$PODS_ROOT/../.xcode.env" ]]; then',
  '  source "$PODS_ROOT/../.xcode.env"',
  'fi',
  '',
  '`"$NODE_BINARY" "$REACT_NATIVE_DIR/scripts/react-native-xcode.sh"`',
  '',
].join('\n')

const samplePodfile = `
require_relative '../node_modules/react-native/scripts/react_native_pods'

target 'MyApp' do
  use_react_native!(:hermes_enabled => true)

  post_install do |installer|
    react_native_post_install(installer)
  end
end
`

describe('injectHermesMinificationPatchIntoPodfile', () => {
  it('injects the marker and patches the bundle phase', () => {
    const out = injectHermesMinificationPatchIntoPodfile(samplePodfile)

    expect(out).toContain(HERMES_MINIFY_PATCH_MARKER)
    expect(out).toContain('Bundle React Native code and images')
    expect(out).toContain('--minify true')
  })

  it('only minifies on Release', () => {
    const out = injectHermesMinificationPatchIntoPodfile(samplePodfile)
    expect(out).toMatch(/if \[ "\$CONFIGURATION" = "Release" \]/)
  })

  it('is idempotent', () => {
    const once = injectHermesMinificationPatchIntoPodfile(samplePodfile)
    const twice = injectHermesMinificationPatchIntoPodfile(once)
    expect(twice).toBe(once)
  })

  it('composes with the Swift 6 workaround', () => {
    const withSwift6 = injectSwift6WorkaroundIntoPodfile(samplePodfile)
    const all = injectHermesMinificationPatchIntoPodfile(withSwift6)

    expect(all).toContain('SWIFT_STRICT_CONCURRENCY')
    expect(all).toContain(HERMES_MINIFY_PATCH_MARKER)
  })
})

describe('injectExpoUpdatesIosResourcesPatchIntoPodfile', () => {
  it('patches the EXUpdates resources phase to generate a real manifest', () => {
    const out = injectExpoUpdatesIosResourcesPatchIntoPodfile(samplePodfile)

    expect(out).toContain(EXPO_UPDATES_METRO_SKIP_MARKER)
    expect(out).toContain("target.name == 'EXUpdates'")
    expect(out).toContain('Generate updates resources for expo-updates')
    expect(out).toContain('export EXPO_NO_METRO_WORKSPACE_ROOT=1')
    expect(out).not.toContain('SKIP_BUNDLING=1')
    expect(out).not.toMatch(/assets:\[\]/)
  })

  it('is idempotent', () => {
    const once = injectExpoUpdatesIosResourcesPatchIntoPodfile(samplePodfile)
    const twice = injectExpoUpdatesIosResourcesPatchIntoPodfile(once)
    expect(twice).toBe(once)
  })

  it('composes with the Swift 6 workaround and Hermes minification', () => {
    const withSwift6 = injectSwift6WorkaroundIntoPodfile(samplePodfile)
    const withHermes = injectHermesMinificationPatchIntoPodfile(withSwift6)
    const all = injectExpoUpdatesIosResourcesPatchIntoPodfile(withHermes)

    expect(all).toContain('SWIFT_STRICT_CONCURRENCY')
    expect(all).toContain(HERMES_MINIFY_PATCH_MARKER)
    expect(all).toContain(EXPO_UPDATES_METRO_SKIP_MARKER)
  })
})

describe('addPodHermescToBundleReactNativeShellScript', () => {
  it('exports the pod hermesc, guarded on the file existing', () => {
    const out = addPodHermescToBundleReactNativeShellScript(sampleBundleScript)

    expect(out).toContain('[vxrn/one] use the hermes-engine pod')
    expect(out).toContain(
      'export HERMES_CLI_PATH="${PODS_ROOT}/hermes-engine/destroot/bin/hermesc"'
    )
    expect(out).toMatch(
      /if \[ -f "\$\{PODS_ROOT\}\/hermes-engine\/destroot\/bin\/hermesc" \]; then/
    )
  })

  it('inserts the export before the bundle command, not after', () => {
    const out = addPodHermescToBundleReactNativeShellScript(sampleBundleScript)
    expect(out.indexOf('HERMES_CLI_PATH')).toBeLessThan(
      out.indexOf('react-native-xcode.sh')
    )
  })

  it('is idempotent', () => {
    const once = addPodHermescToBundleReactNativeShellScript(sampleBundleScript)
    const twice = addPodHermescToBundleReactNativeShellScript(once)
    expect(twice).toBe(once)
  })

  it('composes with the CLI_PATH patch (anchor survives both inserts)', () => {
    const withCli = addSetCliPathToBundleReactNativeShellScript(sampleBundleScript)
    const all = addPodHermescToBundleReactNativeShellScript(withCli)

    expect(all).toContain('CLI_PATH="')
    expect(all).toContain(
      'export HERMES_CLI_PATH="${PODS_ROOT}/hermes-engine/destroot/bin/hermesc"'
    )
    // both exports land before the node bundle command
    expect(all.indexOf('CLI_PATH')).toBeLessThan(all.indexOf('react-native-xcode.sh'))
    expect(all.indexOf('HERMES_CLI_PATH')).toBeLessThan(
      all.indexOf('react-native-xcode.sh')
    )
  })
})
