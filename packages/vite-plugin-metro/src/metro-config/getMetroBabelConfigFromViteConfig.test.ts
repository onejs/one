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
  it('picks up ONE_PUBLIC_ keys by default and never copies expo keys', () => {
    process.env.ONE_PUBLIC_API = 'https://api.test'
    try {
      const env = pluginEnv(
        viteConfig({ env: { ONE_PUBLIC_API: 'https://api.test' } })
      )
      expect(env.ONE_PUBLIC_API).toBe('https://api.test')
      expect(env).not.toHaveProperty('EXPO_OS')
    } finally {
      delete process.env.ONE_PUBLIC_API
    }
  })

  it('harvests ONE_PLATFORM from defines for parity with rolldown', () => {
    const env = pluginEnv(
      viteConfig({ define: { 'process.env.ONE_PLATFORM': '"ios"' } })
    )
    expect(env.ONE_PLATFORM).toBe('ios')
  })

  it('rejects an expo env prefix instead of copying it', () => {
    expect(() =>
      pluginEnv(viteConfig({ envPrefix: ['VITE_', 'EXPO_PUBLIC_'] }))
    ).toThrow(/rename it to ONE_PUBLIC_\*/)
  })

  it('rejects expo keys hiding in the loaded env', () => {
    expect(() =>
      pluginEnv(viteConfig({ env: { EXPO_PUBLIC_API: 'x' } }))
    ).toThrow(/rename it to ONE_PUBLIC_\*/)
  })

  it('rejects expo keys hiding in defines', () => {
    expect(() =>
      pluginEnv(viteConfig({ define: { 'process.env.EXPO_OS': '"ios"' } }))
    ).toThrow(/ONE_PUBLIC_\* or ONE_PLATFORM/)
  })
})
