import { describe, expect, it } from 'vitest'
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

describe('metro babel env contract', () => {
  it('picks up ONE_PUBLIC_ keys by default with Expo aliases', () => {
    const env = pluginEnv(viteConfig({ env: { ONE_PUBLIC_API: 'https://api.test' } }))
    expect(env.ONE_PUBLIC_API).toBe('https://api.test')
    expect(env.EXPO_PUBLIC_API).toBe('https://api.test')
  })

  it('harvests ONE_PLATFORM from defines for parity with rolldown', () => {
    const env = pluginEnv(viteConfig({ define: { 'process.env.ONE_PLATFORM': '"ios"' } }))
    expect(env.ONE_PLATFORM).toBe('ios')
  })

  it('accepts an Expo env prefix', () => {
    expect(pluginEnv(viteConfig({ envPrefix: ['VITE_', 'EXPO_PUBLIC_'] }))).toMatchObject(
      { MODE: 'development' }
    )
  })

  it('aliases Expo keys from the loaded env', () => {
    expect(pluginEnv(viteConfig({ env: { EXPO_PUBLIC_API: 'x' } }))).toMatchObject({
      EXPO_PUBLIC_API: 'x',
      ONE_PUBLIC_API: 'x',
    })
  })

  it('accepts Expo platform defines for the platform plugin to override', () => {
    expect(
      pluginEnv(viteConfig({ define: { 'process.env.EXPO_OS': '"ios"' } })).EXPO_OS
    ).toBe('ios')
  })
})
