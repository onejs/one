import { describe, expect, it } from 'vitest'
import { resolveEnvironmentGuard, loadEnvironmentGuard } from './environmentGuardPlugin'

describe('environmentGuardPlugin', () => {
  describe('resolveEnvironmentGuard', () => {
    it('returns null for non-guard specifiers', () => {
      expect(resolveEnvironmentGuard('react', 'client')).toBeNull()
      expect(resolveEnvironmentGuard('vite', 'ssr')).toBeNull()
      expect(resolveEnvironmentGuard('some-other-pkg', 'ios')).toBeNull()
    })

    it('returns virtual id for server-only', () => {
      const id = resolveEnvironmentGuard('server-only', 'ssr')
      expect(id).toBe('\0one-env-guard:server-only:ssr')
    })

    it('returns virtual id for client-only', () => {
      const id = resolveEnvironmentGuard('client-only', 'client')
      expect(id).toBe('\0one-env-guard:client-only:client')
    })

    it('returns virtual id for native-only', () => {
      const id = resolveEnvironmentGuard('native-only', 'ios')
      expect(id).toBe('\0one-env-guard:native-only:ios')
    })

    it('returns virtual id for web-only', () => {
      const id = resolveEnvironmentGuard('web-only', 'client')
      expect(id).toBe('\0one-env-guard:web-only:client')
    })
  })

  describe('loadEnvironmentGuard', () => {
    it('returns null for non-virtual ids', () => {
      expect(loadEnvironmentGuard('react')).toBeNull()
      expect(loadEnvironmentGuard('/some/path.ts')).toBeNull()
    })

    // server-only: allowed in ssr, forbidden in client/ios/android
    it('server-only: allowed in ssr', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:server-only:ssr')
      expect(result).toBe('export {}')
    })

    it('server-only: forbidden in client', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:server-only:client')
      expect(result).toContain('throw new Error')
      expect(result).toContain('server-only')
      expect(result).toContain('client')
    })

    it('server-only: forbidden in ios', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:server-only:ios')
      expect(result).toContain('throw new Error')
    })

    it('server-only: forbidden in android', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:server-only:android')
      expect(result).toContain('throw new Error')
    })

    // client-only: allowed in client, forbidden in ssr/ios/android
    it('client-only: allowed in client', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:client-only:client')
      expect(result).toBe('export {}')
    })

    it('client-only: forbidden in ssr', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:client-only:ssr')
      expect(result).toContain('throw new Error')
    })

    it('client-only: forbidden in ios', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:client-only:ios')
      expect(result).toContain('throw new Error')
    })

    it('client-only: forbidden in android', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:client-only:android')
      expect(result).toContain('throw new Error')
    })

    // native-only: allowed in ios/android, forbidden in client/ssr
    it('native-only: allowed in ios', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:native-only:ios')
      expect(result).toBe('export {}')
    })

    it('native-only: allowed in android', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:native-only:android')
      expect(result).toBe('export {}')
    })

    it('native-only: forbidden in client', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:native-only:client')
      expect(result).toContain('throw new Error')
    })

    it('native-only: forbidden in ssr', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:native-only:ssr')
      expect(result).toContain('throw new Error')
    })

    // web-only: allowed in client/ssr, forbidden in ios/android
    it('web-only: allowed in client', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:web-only:client')
      expect(result).toBe('export {}')
    })

    it('web-only: allowed in ssr', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:web-only:ssr')
      expect(result).toBe('export {}')
    })

    it('web-only: forbidden in ios', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:web-only:ios')
      expect(result).toContain('throw new Error')
    })

    it('web-only: forbidden in android', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:web-only:android')
      expect(result).toContain('throw new Error')
    })

    it('disabled guards always pass', () => {
      const result = loadEnvironmentGuard('\0one-env-guard:client-only:disabled')
      expect(result).toBe('export {}')
    })
  })

  describe('options', () => {
    it('disabled: true makes all guards no-ops', () => {
      const id = resolveEnvironmentGuard('client-only', 'ssr', { disabled: true })
      expect(id).toBe('\0one-env-guard:client-only:disabled')
      // and it should pass when loaded
      expect(loadEnvironmentGuard(id!)).toBe('export {}')
    })

    it('disableGuards: disables specific guard types', () => {
      // client-only disabled
      const id1 = resolveEnvironmentGuard('client-only', 'ssr', {
        disableGuards: ['client-only'],
      })
      expect(id1).toBe('\0one-env-guard:client-only:disabled')

      // server-only still works normally
      const id2 = resolveEnvironmentGuard('server-only', 'client', {
        disableGuards: ['client-only'],
      })
      expect(id2).toBe('\0one-env-guard:server-only:client')
      expect(loadEnvironmentGuard(id2!)).toContain('throw new Error')
    })

    it('disableGuards: can disable multiple guards', () => {
      const id1 = resolveEnvironmentGuard('client-only', 'ssr', {
        disableGuards: ['client-only', 'server-only'],
      })
      expect(id1).toBe('\0one-env-guard:client-only:disabled')

      const id2 = resolveEnvironmentGuard('server-only', 'client', {
        disableGuards: ['client-only', 'server-only'],
      })
      expect(id2).toBe('\0one-env-guard:server-only:disabled')

      // native-only still enforced
      const id3 = resolveEnvironmentGuard('native-only', 'client', {
        disableGuards: ['client-only', 'server-only'],
      })
      expect(id3).toBe('\0one-env-guard:native-only:client')
    })
  })
})
