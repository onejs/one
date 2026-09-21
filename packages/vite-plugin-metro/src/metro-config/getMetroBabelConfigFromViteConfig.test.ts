import { afterEach, describe, expect, it } from 'vitest'
import { getMetroBabelConfigFromViteConfig } from './getMetroBabelConfigFromViteConfig'

function viteConfig(overrides: Record<string, any> = {}) {
  return {
    mode: 'development',
    base: '/',
    env: {},
    define: {},
    ...overrides,
  } as any
}

function pluginEnv(config: any): Record<string, any> {
  const babelConfig = getMetroBabelConfigFromViteConfig(config)
  const plugin = (babelConfig.plugins as any[])[0]
  return plugin[1].env
}

afterEach(() => {
  delete process.env.ONE_PUBLIC_USE_RN_FETCH
  delete process.env.EXPO_PUBLIC_USE_RN_FETCH
})

describe('metro babel env contract', () => {
  it('picks up ONE_PUBLIC_ keys and shadows the exact Expo key', () => {
    const env = pluginEnv(viteConfig({ env: { ONE_PUBLIC_USE_RN_FETCH: 'one-value' } }))
    expect(env.ONE_PUBLIC_USE_RN_FETCH).toBe('one-value')
    expect(env.EXPO_PUBLIC_USE_RN_FETCH).toBe('one-value')
  })

  it('harvests ONE_PLATFORM from defines for parity with rolldown', () => {
    const env = pluginEnv(viteConfig({ define: { 'process.env.ONE_PLATFORM': '"ios"' } }))
    expect(env.ONE_PLATFORM).toBe('ios')
  })

  it('accepts the Expo public prefix', () => {
    process.env.EXPO_PUBLIC_USE_RN_FETCH = 'expo-value'
    const env = pluginEnv(viteConfig({ envPrefix: ['VITE_', 'EXPO_PUBLIC_'], env: {} }))
    expect(env.EXPO_PUBLIC_USE_RN_FETCH).toBe('expo-value')
    expect(env).not.toHaveProperty('ONE_PUBLIC_USE_RN_FETCH')
  })

  it('preserves an explicit Expo value instead of replacing it with One', () => {
    const env = pluginEnv(
      viteConfig({
        env: {
          ONE_PUBLIC_USE_RN_FETCH: 'one-value',
          EXPO_PUBLIC_USE_RN_FETCH: 'expo-value',
        },
      })
    )
    expect(env.ONE_PUBLIC_USE_RN_FETCH).toBe('one-value')
    expect(env.EXPO_PUBLIC_USE_RN_FETCH).toBe('expo-value')
  })

  it('accepts Expo compatibility defines', () => {
    const env = pluginEnv(
      viteConfig({
        define: {
          'process.env.EXPO_PUBLIC_USE_RN_FETCH': '"1"',
          'process.env.EXPO_OS': '"ios"',
        },
      })
    )
    expect(env.EXPO_PUBLIC_USE_RN_FETCH).toBe('1')
    expect(env.EXPO_OS).toBe('ios')
  })
})
