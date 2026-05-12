import { describe, expect, it } from 'vitest'
import {
  injectHermesMinificationPatchIntoPodfile,
  injectSwift6WorkaroundIntoPodfile,
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
