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
  delete process.env.ONE_PUBLIC_API
  delete process.env.EXPO_PUBLIC_API
})

describe('metro babel env contract', () => {
  it('picks up ONE_PUBLIC_ keys by default', () => {
    process.env.ONE_PUBLIC_API = 'https://api.test'
    const env = pluginEnv(viteConfig({ env: { ONE_PUBLIC_API: 'https://api.test' } }))
    expect(env.ONE_PUBLIC_API).toBe('https://api.test')
  })

  it('accepts EXPO_PUBLIC_ keys even when one defaults to ONE_PUBLIC_*', () => {
    process.env.EXPO_PUBLIC_API = 'https://expo.test'
    const env = pluginEnv(
      viteConfig({
        envPrefix: ['VITE_', 'ONE_PUBLIC_'],
        env: { EXPO_PUBLIC_API: 'https://expo.test' },
      })
    )
    expect(env.EXPO_PUBLIC_API).toBe('https://expo.test')
  })

  it('picks up EXPO_PUBLIC_ from the shell when vite filtered config.env', () => {
    process.env.EXPO_PUBLIC_API = 'https://expo-shell.test'
    const env = pluginEnv(viteConfig({ envPrefix: ['VITE_', 'ONE_PUBLIC_'], env: {} }))
    expect(env.EXPO_PUBLIC_API).toBe('https://expo-shell.test')
  })

  it('keeps each public prefix on its own values without cross-aliasing', () => {
    process.env.ONE_PUBLIC_API = 'one-value'
    process.env.EXPO_PUBLIC_API = 'expo-value'
    try {
      const env = pluginEnv(
        viteConfig({
          env: { ONE_PUBLIC_API: 'one-value', EXPO_PUBLIC_API: 'expo-value' },
        })
      )
      expect(env.ONE_PUBLIC_API).toBe('one-value')
      expect(env.EXPO_PUBLIC_API).toBe('expo-value')
      expect(env).not.toHaveProperty('ONE_PUBLIC_EXPO_PUBLIC_API')
    } finally {
      delete process.env.ONE_PUBLIC_API
      delete process.env.EXPO_PUBLIC_API
    }
  })

  it('harvests ONE_PLATFORM and preserves an explicit EXPO_OS define', () => {
    const env = pluginEnv(
      viteConfig({
        define: {
          'process.env.ONE_PLATFORM': '"ios"',
          'process.env.EXPO_OS': '"ios"',
        },
      })
    )
    expect(env.ONE_PLATFORM).toBe('ios')
    expect(env.EXPO_OS).toBe('ios')
  })

  it('allows an expo env prefix instead of rejecting it', () => {
    const env = pluginEnv(viteConfig({ envPrefix: ['VITE_', 'EXPO_PUBLIC_'], env: {} }))
    expect(env.MODE).toBe('development')
  })
})
