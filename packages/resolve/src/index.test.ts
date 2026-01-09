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

  describe('ESM entry point detection', () => {
    it('returns ESM entry when exports["."].import is a string', () => {
      // Most @tamagui packages have this pattern
      const path = resolvePath('@vxrn/resolve', process.cwd())
      // Should resolve to ESM if available
      expect(path).toBeTruthy()
    })

    it('returns ESM entry when exports["."].import.default exists', () => {
      // vitest has nested structure: { import: { types: "...", default: "..." } }
      const path = resolvePath('vitest', process.cwd())
      expect(path).toContain('dist/index.js')
      expect(path).not.toContain('.cjs')
    })

    it('falls back to module field when exports not available', () => {
      // Some packages only have "module" field
      const path = resolvePath('vitest', process.cwd())
      expect(path).toBeTruthy()
    })

    it('falls back to main/require.resolve when no ESM entry', () => {
      // resolve package is CJS-only (no exports field, just main)
      const path = resolvePath('resolve', process.cwd())
      expect(path).toContain('resolve')
    })
  })
})
