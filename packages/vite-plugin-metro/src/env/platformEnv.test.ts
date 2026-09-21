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

  it('defines EXPO_OS as the exact native platform alias', () => {
    for (const environment of ['client', 'ssr'] as const) {
      expect(getPlatformEnv(environment)).not.toHaveProperty('EXPO_OS')
      expect(getPlatformEnvDefine(environment)).not.toHaveProperty('process.env.EXPO_OS')
    }

    for (const platform of ['ios', 'android'] as const) {
      const define = getPlatformEnvDefine(platform)
      expect(getPlatformEnv(platform).EXPO_OS).toBe(platform)
      expect(define['process.env.EXPO_OS']).toBe(JSON.stringify(platform))
      expect(define['import.meta.env.EXPO_OS']).toBe(JSON.stringify(platform))
      expect(define['process.env.ONE_PLATFORM']).toBe(JSON.stringify(platform))
    }
  })

  it('maps metro platforms to vite environments without probing', () => {
    expect(metroPlatformToViteEnvironment('ios')).toBe('ios')
    expect(metroPlatformToViteEnvironment('android')).toBe('android')
    expect(metroPlatformToViteEnvironment(null)).toBe('client')
    expect(metroPlatformToViteEnvironment(undefined)).toBe('client')
  })
})
