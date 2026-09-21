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

  it('defines the Expo platform alias only on native', () => {
    for (const environment of ['ios', 'android'] as const) {
      expect(getPlatformEnv(environment).EXPO_OS).toBe(
        getPlatformEnv(environment).ONE_PLATFORM
      )
      const define = getPlatformEnvDefine(environment)
      expect(define['process.env.EXPO_OS']).toBe(define['process.env.ONE_PLATFORM'])
      expect(define['import.meta.env.EXPO_OS']).toBe(
        define['import.meta.env.ONE_PLATFORM']
      )
    }
    for (const environment of ['client', 'ssr'] as const) {
      expect(getPlatformEnv(environment)).not.toHaveProperty('EXPO_OS')
      const define = getPlatformEnvDefine(environment)
      expect(define).not.toHaveProperty('process.env.EXPO_OS')
      expect(define).not.toHaveProperty('import.meta.env.EXPO_OS')
    }
    const define = getPlatformEnvDefine('ios')
    expect(define['process.env.ONE_PLATFORM']).toBe('"ios"')
    expect(define['import.meta.env.ONE_PLATFORM']).toBe('"ios"')
  })

  it('maps metro platforms to vite environments without probing', () => {
    expect(metroPlatformToViteEnvironment('ios')).toBe('ios')
    expect(metroPlatformToViteEnvironment('android')).toBe('android')
    expect(metroPlatformToViteEnvironment(null)).toBe('client')
    expect(metroPlatformToViteEnvironment(undefined)).toBe('client')
  })
})
