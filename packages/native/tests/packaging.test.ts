import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Metro serves `react-native`-condition entries raw through the babel
// transformer. Pointing them at TypeScript source breaks iOS bundles with
// TransformErrors the moment the chain lacks a base preset, and ships
// unbuilt code even when it doesn't. Only dist serves Metro; src/specs
// stays published for pod-install codegen (codegenConfig.jsSrcsDir).
describe('@vxrn/native packaging', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../package.json'), 'utf8')
  )

  it('serves Metro prebuilt dist, never TypeScript source', () => {
    const entries: Array<[string, unknown]> = [
      ['react-native', pkg['react-native']],
    ]
    for (const [subpath, conditions] of Object.entries(pkg.exports ?? {})) {
      if (conditions && typeof conditions === 'object') {
        entries.push([
          `exports[${subpath}].react-native`,
          (conditions as Record<string, unknown>)['react-native'],
        ])
      }
    }

    expect(entries.length).toBeGreaterThan(1)
    for (const [where, target] of entries) {
      expect(typeof target).toBe('string')
      expect(target as string, where).toMatch(/^\.\/dist\//)
      expect(target as string, where).not.toContain('/src/')
    }
  })

  it('keeps src/specs published for pod-install codegen', () => {
    expect(pkg.codegenConfig.jsSrcsDir).toBe('src/specs')
    expect(pkg.files).toContain('src')
  })
})
