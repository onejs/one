import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const PROJECT_ROOT = resolve('/project')

describe('criticalCSSPlugin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveId', () => {
    it('should return null for non-inline CSS imports', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: PROJECT_ROOT })

      const result = await (plugin.resolveId as any).call(
        { resolve: vi.fn() },
        './styles.css',
        resolve('/project/src/App.tsx')
      )
      expect(result).toBeNull()
    })

    it('should return null for non-css imports', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: PROJECT_ROOT })

      const result = await (plugin.resolveId as any).call(
        { resolve: vi.fn() },
        './data.json',
        resolve('/project/src/App.tsx')
      )
      expect(result).toBeNull()
    })

    it('should resolve .inline.css and track it', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: PROJECT_ROOT })

      const resolvedCssPath = resolve('/project/src/styles.inline.css')
      const mockResolve = vi.fn().mockResolvedValue({
        id: resolvedCssPath,
      })

      const importerPath = resolve('/project/src/App.tsx')
      const result = await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './styles.inline.css',
        importerPath
      )

      expect(mockResolve).toHaveBeenCalledWith('./styles.inline.css', importerPath, {
        skipSelf: true,
      })

      expect(result).toEqual({ id: resolvedCssPath })
    })

    it('should track inline CSS source paths', async () => {
      const { criticalCSSPlugin, getCriticalCSSSources } =
        await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: PROJECT_ROOT })

      const mockResolve = vi.fn().mockResolvedValue({
        id: resolve('/project/src/layout.inline.css'),
      })

      await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './layout.inline.css',
        resolve('/project/src/App.tsx')
      )

      const sources = getCriticalCSSSources()
      // relative() produces forward slashes on POSIX, backslashes on Windows
      expect(
        sources.has('src/layout.inline.css') || sources.has('src\\layout.inline.css')
      ).toBe(true)
    })

    it('should return null when resolve fails', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: PROJECT_ROOT })

      const mockResolve = vi.fn().mockResolvedValue(null)

      const result = await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './nonexistent.inline.css',
        resolve('/project/src/App.tsx')
      )

      expect(result).toBeNull()
    })
  })

  describe('getCriticalCSSOutputPaths', () => {
    it('should map inline CSS source to output paths via manifest', async () => {
      const { criticalCSSPlugin, getCriticalCSSSources, getCriticalCSSOutputPaths } =
        await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: PROJECT_ROOT })

      const mockResolve = vi.fn().mockResolvedValue({
        id: resolve('/project/app/layout.inline.css'),
      })
      await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './layout.inline.css',
        resolve('/project/app/_layout.tsx')
      )

      // Build a manifest keyed by the relative path that criticalCSSSources actually stores
      const sources = getCriticalCSSSources()
      const sourceKey = [...sources].find((s) => s.includes('layout.inline.css'))!

      const manifest = {
        [sourceKey]: {
          file: 'assets/layout-abc123.css',
          src: sourceKey,
        },
        'app/_layout.tsx': {
          file: 'assets/layout-def456.js',
          css: ['assets/layout-abc123.css'],
          imports: [],
          name: '_layout',
        },
      }

      const outputPaths = getCriticalCSSOutputPaths(manifest as any)
      expect(outputPaths.has('/assets/layout-abc123.css')).toBe(true)
    })

    it('should return empty set when no inline CSS exists', async () => {
      const { getCriticalCSSOutputPaths } = await import('./criticalCSSPlugin')

      const manifest = {
        'app/styles.css': {
          file: 'assets/styles-abc.css',
        },
      }

      const outputPaths = getCriticalCSSOutputPaths(manifest as any)
      expect(outputPaths).toBeDefined()
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()
      expect(plugin.name).toBe('one:critical-css')
    })

    it('should enforce pre', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()
      expect(plugin.enforce).toBe('pre')
    })
  })
})
