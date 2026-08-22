import { describe, expect, it } from 'vitest'
import { deepMergeOptimizeDeps, mergeUserConfig } from './mergeUserConfig'

describe('deepMergeOptimizeDeps', () => {
  it('filters excluded deps from include list', () => {
    const a = {
      optimizeDeps: {
        include: ['react', 'react-native-reanimated', 'lodash'],
        exclude: [],
      },
    }
    const b = {
      optimizeDeps: {
        exclude: ['react-native-reanimated'],
      },
    }

    deepMergeOptimizeDeps(a, b)

    expect(a.optimizeDeps.include).toContain('react')
    expect(a.optimizeDeps.include).toContain('lodash')
    expect(a.optimizeDeps.include).not.toContain('react-native-reanimated')
    expect(a.optimizeDeps.exclude).toContain('react-native-reanimated')
  })

  it('filters excluded deps from noExternal list', () => {
    const a = {
      optimizeDeps: {
        include: ['react', 'react-native-reanimated'],
      },
      noExternal: ['react', 'react-native-reanimated'] as (string | RegExp)[],
    }
    const b = {
      optimizeDeps: {
        exclude: ['react-native-reanimated'],
      },
    }

    deepMergeOptimizeDeps(a, b)

    expect(a.noExternal).toContain('react')
    expect(a.noExternal).not.toContain('react-native-reanimated')
  })

  it('filters excluded deps from needsInterop list', () => {
    const a = {
      optimizeDeps: {
        include: [],
        needsInterop: ['react', 'react-native-reanimated'],
      },
    }
    const b = {
      optimizeDeps: {
        exclude: ['react-native-reanimated'],
      },
    }

    deepMergeOptimizeDeps(a, b)

    expect(a.optimizeDeps.needsInterop).toContain('react')
    expect(a.optimizeDeps.needsInterop).not.toContain('react-native-reanimated')
  })

  it('merges excludes from all sources', () => {
    const a = {
      optimizeDeps: {
        exclude: ['a'],
      },
    }
    const b = {
      optimizeDeps: {
        exclude: ['b'],
      },
    }
    const extra = {
      include: [],
      exclude: ['c'],
      needsInterop: [],
      rolldownOptions: {},
    }

    deepMergeOptimizeDeps(a, b, extra)

    expect(a.optimizeDeps.exclude).toContain('a')
    expect(a.optimizeDeps.exclude).toContain('b')
    expect(a.optimizeDeps.exclude).toContain('c')
  })

  it('preserves noExternal: true when set', () => {
    const a = {
      optimizeDeps: {},
      noExternal: true as const,
    }
    const b = {
      optimizeDeps: {
        exclude: ['react-native-reanimated'],
      },
    }

    deepMergeOptimizeDeps(a, b)

    expect(a.noExternal).toBe(true)
  })

  it('handles RegExp in noExternal', () => {
    const regex = /some-pattern/
    const a = {
      optimizeDeps: {
        include: ['react', 'react-native-reanimated'],
      },
      noExternal: [regex, 'react', 'react-native-reanimated'] as (string | RegExp)[],
    }
    const b = {
      optimizeDeps: {
        exclude: ['react-native-reanimated'],
      },
    }

    deepMergeOptimizeDeps(a, b)

    // regex should be preserved
    expect(a.noExternal).toContain(regex)
    expect(a.noExternal).toContain('react')
    expect(a.noExternal).not.toContain('react-native-reanimated')
  })
})

describe('mergeUserConfig', () => {
  const optimizeDeps = {
    include: [],
    exclude: [],
    needsInterop: [],
    rolldownOptions: {
      moduleTypes: { '.js': 'jsx', '.ts': 'ts', '.tsx': 'tsx' },
    },
  }

  it('keeps the client optimizer moduleTypes when the app declares optimizeDeps', () => {
    // an app declaring its own optimizeDeps used to replace the client
    // environment's wholesale once vite normalized it, dropping moduleTypes and
    // breaking every dep that ships .ts (all of expo 57).
    const serverConfig = {
      optimizeDeps: {},
      environments: {
        client: {
          optimizeDeps: {
            include: ['react-native-screens'],
            rolldownOptions: optimizeDeps.rolldownOptions,
          },
        },
      },
    }

    const merged: any = mergeUserConfig(optimizeDeps, serverConfig as any, {
      optimizeDeps: { include: ['async-retry'], exclude: ['oxc-parser'] },
    })

    const client = merged.environments.client.optimizeDeps
    expect(client.rolldownOptions.moduleTypes['.ts']).toBe('ts')
    expect(client.include).toContain('async-retry')
    expect(client.include).toContain('react-native-screens')
    expect(client.exclude).toContain('oxc-parser')
    // rolldownOptions must travel exactly one path
    expect(merged.optimizeDeps).toEqual({})
  })
})
