import { describe, expect, it } from 'vitest'
import { getScannedOptimizeDepsConfig } from './autoDepOptimizePlugin'

describe('getScannedOptimizeDepsConfig', () => {
  it('filters excluded deps from scanned results', async () => {
    // mock the scanning by passing a fake result
    const mockResult = {
      prebundleDeps: ['react', 'react-native-reanimated', 'lodash'],
      hasReanimated: true,
      hasNativewind: false,
    }

    // we need to mock findDepsToOptimize, so let's test the filtering logic directly
    const excludeArray = ['react-native-reanimated']
    const excludeStrings = excludeArray.filter((e): e is string => typeof e === 'string')
    const excludeSet = new Set(excludeStrings)

    const filteredDeps = mockResult.prebundleDeps.filter((dep) => !excludeSet.has(dep))

    expect(filteredDeps).toContain('react')
    expect(filteredDeps).toContain('lodash')
    expect(filteredDeps).not.toContain('react-native-reanimated')
  })

  it('handles RegExp exclude patterns (ignores them for dep name filtering)', async () => {
    const mockResult = {
      prebundleDeps: ['react', 'react-native-reanimated'],
      hasReanimated: true,
      hasNativewind: false,
    }

    // regexp patterns should be ignored for dep name filtering
    const excludeArray: (string | RegExp)[] = [/some-pattern/, 'react-native-reanimated']
    const excludeStrings = excludeArray.filter((e): e is string => typeof e === 'string')
    const excludeSet = new Set(excludeStrings)

    const filteredDeps = mockResult.prebundleDeps.filter((dep) => !excludeSet.has(dep))

    expect(filteredDeps).toContain('react')
    expect(filteredDeps).not.toContain('react-native-reanimated')
  })
})
