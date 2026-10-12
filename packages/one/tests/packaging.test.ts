import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// Metro serves `react-native`-condition entries raw through the babel
// transformer. Pointing them at TypeScript source breaks iOS bundles with
// TransformErrors the moment the chain lacks a base preset, and ships
// unbuilt code even when it doesn't. Only dist serves Metro; src/specs
// stays published for pod-install codegen (codegenConfig.jsSrcsDir).
describe('one native packaging', () => {
  const pkg = JSON.parse(
    readFileSync(resolve(__dirname, '../package.json'), 'utf8')
  )

  it('serves Metro prebuilt dist, never TypeScript source', () => {
    // every react-native condition target, including nested condition objects
    const targets: Array<[string, string]> = []
    const collect = (where: string, value: unknown) => {
      if (typeof value === 'string') targets.push([where, value])
      else if (value && typeof value === 'object') {
        for (const [key, inner] of Object.entries(value)) collect(`${where}.${key}`, inner)
      }
    }
    for (const [subpath, conditions] of Object.entries(pkg.exports ?? {})) {
      if (conditions && typeof conditions === 'object' && 'react-native' in conditions) {
        collect(`exports[${subpath}].react-native`, conditions['react-native'])
      }
    }

    expect(targets.length).toBeGreaterThan(1)
    for (const [where, target] of targets) {
      expect(target, where).toMatch(/^\.\/(dist|types)\//)
      expect(target, where).not.toContain('/src/')
    }
  })

  it('keeps src/platform/specs published for pod-install codegen', () => {
    expect(pkg.codegenConfig.jsSrcsDir).toBe('src/platform/specs')
    expect(pkg.files).toContain('src')
  })
})
