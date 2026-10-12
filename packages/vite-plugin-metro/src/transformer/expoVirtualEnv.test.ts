import { describe, expect, it } from 'vitest'

import { substituteExpoVirtualEnvSource } from './expoVirtualEnv'

const virtualFilename = '/proj/node_modules/expo/virtual/env.js'
const virtualSource = 'export const env = process.env;'

describe('substituteExpoVirtualEnvSource', () => {
  it('generates the require.context import in dev', () => {
    const out = substituteExpoVirtualEnvSource({
      filename: virtualFilename,
      src: virtualSource,
      projectRoot: '/proj',
      dev: true,
      environment: 'client',
    })
    expect(out).toContain('require.context("../../..",false,/^\\.\\/\\.env/)')
    expect(out).toContain('.env.development.local')
    expect(out).toContain('...process.env')
  })

  it('generates the naming-error proxy in production', () => {
    const out = substituteExpoVirtualEnvSource({
      filename: virtualFilename,
      src: virtualSource,
      projectRoot: '/proj',
      dev: false,
      environment: 'client',
    })
    expect(out).toContain('new Proxy')
    expect(out).toContain('not supported in production bundles')
  })

  it('leaves the virtual module alone outside client environments', () => {
    for (const environment of ['node', 'react-server']) {
      expect(
        substituteExpoVirtualEnvSource({
          filename: virtualFilename,
          src: virtualSource,
          projectRoot: '/proj',
          dev: true,
          environment,
        })
      ).toBe(virtualSource)
    }
  })

  it('leaves ordinary files alone', () => {
    expect(
      substituteExpoVirtualEnvSource({
        filename: '/proj/src/app.js',
        src: 'const a = 1',
        projectRoot: '/proj',
        dev: true,
        environment: 'client',
      })
    ).toBe('const a = 1')
  })

  it('leaves .env files alone without Expo installed', () => {
    const src = 'EXPO_PUBLIC_A=1\nSECRET=2\n'
    expect(
      substituteExpoVirtualEnvSource({
        filename: '/proj/.env',
        src,
        projectRoot: '/proj-no-expo',
        dev: true,
        environment: 'client',
      })
    ).toBe(src)
  })
})
