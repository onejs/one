import { describe, expect, it } from 'vitest'
import {
  injectExpoUpdatesIosResourcesPatchIntoPodfile,
  injectHermesMinificationPatchIntoPodfile,
  injectSwift6WorkaroundIntoPodfile,
  EXPO_UPDATES_METRO_SKIP_MARKER,
  HERMES_MINIFY_PATCH_MARKER,
} from './expo-plugin.cjs'

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
  it('injects the marker and patches the EXUpdates resources phase', () => {
    const out = injectExpoUpdatesIosResourcesPatchIntoPodfile(samplePodfile)

    expect(out).toContain(EXPO_UPDATES_METRO_SKIP_MARKER)
    expect(out).toContain("target.name == 'EXUpdates'")
    expect(out).toContain('Generate updates resources for expo-updates')
    expect(out).toContain('SKIP_BUNDLING=1')
    expect(out).toContain('app.manifest')
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
