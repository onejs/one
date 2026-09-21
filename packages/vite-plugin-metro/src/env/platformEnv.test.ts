import { describe, expect, it } from 'vitest'
import {
  getPlatformEnv,
  getPlatformEnvDefine,
  metroPlatformToViteEnvironment,
} from './platformEnv'

describe('one platform env contract', () => {
  it('exposes ONE_PLATFORM for every vite environment', () => {
    expect(getPlatformEnv('ios').ONE_PLATFORM).toBe('ios')
    expect(getPlatformEnv('android').ONE_PLATFORM).toBe('android')
    expect(getPlatformEnv('client').ONE_PLATFORM).toBe('web')
    expect(getPlatformEnv('ssr').ONE_PLATFORM).toBe('web')
  })

  it('preserves EXPO_OS as ios/android and never synthesizes it for web', () => {
    expect(getPlatformEnv('ios').EXPO_OS).toBe('ios')
    expect(getPlatformEnv('android').EXPO_OS).toBe('android')
    expect(getPlatformEnv('client')).not.toHaveProperty('EXPO_OS')
    expect(getPlatformEnv('ssr')).not.toHaveProperty('EXPO_OS')

    const iosDefine = getPlatformEnvDefine('ios')
    expect(iosDefine['process.env.EXPO_OS']).toBe('"ios"')
    expect(iosDefine['import.meta.env.EXPO_OS']).toBe('"ios"')
    expect(iosDefine['process.env.ONE_PLATFORM']).toBe('"ios"')

    const androidDefine = getPlatformEnvDefine('android')
    expect(androidDefine['process.env.EXPO_OS']).toBe('"android"')

    for (const environment of ['client', 'ssr'] as const) {
      const define = getPlatformEnvDefine(environment)
      expect(define).not.toHaveProperty('process.env.EXPO_OS')
      expect(define).not.toHaveProperty('import.meta.env.EXPO_OS')
      expect(define['process.env.ONE_PLATFORM']).toBe('"web"')
    }
  })

  it('maps metro platforms to vite environments without probing', () => {
    expect(metroPlatformToViteEnvironment('ios')).toBe('ios')
    expect(metroPlatformToViteEnvironment('android')).toBe('android')
    expect(metroPlatformToViteEnvironment(null)).toBe('client')
    expect(metroPlatformToViteEnvironment(undefined)).toBe('client')
  })
})
