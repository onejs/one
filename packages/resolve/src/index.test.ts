import { describe, expect, it } from 'vitest'
import { resolvePath } from './index'
import { existsSync } from 'node:fs'

describe('resolvePath', () => {
  describe('basic resolution', () => {
    it('resolves node builtins', () => {
      expect(resolvePath('node:path')).toBe('node:path')
      expect(resolvePath('node:fs')).toBe('node:fs')
    })

    it('resolves npm packages', () => {
      const path = resolvePath('vitest')
      expect(path).toBeTruthy()
      expect(existsSync(path)).toBe(true)
    })

    it('resolves relative paths from cwd', () => {
      const path = resolvePath('./package.json')
      expect(path).toContain('package.json')
      expect(existsSync(path)).toBe(true)
    })
  })

  describe('respects from parameter', () => {
    it('resolves relative paths from specified directory', () => {
      // Use process.cwd() which is the repo root when running tests
      const path = resolvePath('./package.json', process.cwd())
      expect(path).toBe(process.cwd() + '/package.json')
      expect(existsSync(path)).toBe(true)
    })

    it('resolves npm packages from specified directory', () => {
      const path = resolvePath('vitest', process.cwd())
      expect(path).toContain('vitest')
    })
  })

  describe('returns CJS entry points (require.resolve behavior)', () => {
    it('resolves to CJS entry for dual packages', () => {
      // Packages with both ESM and CJS should resolve to CJS entry
      // This matches require.resolve behavior
      const path = resolvePath('@vxrn/resolve', process.cwd())
      expect(path).toBeTruthy()
      // Should NOT return the ESM entry - require.resolve returns CJS
      expect(path).toContain('cjs')
    })

    it('resolves standard packages correctly', () => {
      const path = resolvePath('vitest', process.cwd())
      expect(path).toBeTruthy()
      expect(existsSync(path)).toBe(true)
    })
  })
})
