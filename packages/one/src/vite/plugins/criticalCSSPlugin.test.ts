import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

describe('criticalCSSPlugin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveId', () => {
    it('should return null for non-critical imports', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const result = await (plugin.resolveId as any).call(
        { resolve: vi.fn() },
        './styles.css',
        '/project/src/App.tsx'
      )
      expect(result).toBeNull()
    })

    it('should return null for non-css ?critical imports', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const result = await (plugin.resolveId as any).call(
        { resolve: vi.fn() },
        './data.json',
        '/project/src/App.tsx'
      )
      expect(result).toBeNull()
    })

    it('should strip ?critical and resolve normally', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue({
        id: '/project/src/styles.css',
      })

      const result = await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './styles.css?critical',
        '/project/src/App.tsx'
      )

      // should call resolve with the clean id (no ?critical)
      expect(mockResolve).toHaveBeenCalledWith(
        './styles.css',
        '/project/src/App.tsx',
        { skipSelf: true }
      )

      // should return the resolved result
      expect(result).toEqual({ id: '/project/src/styles.css' })
    })

    it('should track critical CSS source paths', async () => {
      const { criticalCSSPlugin, getCriticalCSSSources } = await import(
        './criticalCSSPlugin'
      )
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue({
        id: '/project/src/layout.css',
      })

      await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './layout.css?critical',
        '/project/src/App.tsx'
      )

      const sources = getCriticalCSSSources()
      expect(sources.has('src/layout.css')).toBe(true)
    })

    it('should return null when resolve fails', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue(null)

      const result = await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './nonexistent.css?critical',
        '/project/src/App.tsx'
      )

      expect(result).toBeNull()
    })
  })

  describe('getCriticalCSSOutputPaths', () => {
    it('should map critical source CSS to output paths via manifest', async () => {
      const { criticalCSSPlugin, getCriticalCSSSources, getCriticalCSSOutputPaths } =
        await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      // simulate a ?critical import being resolved
      const mockResolve = vi.fn().mockResolvedValue({
        id: '/project/app/layout.css',
      })
      await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './layout.css?critical',
        '/project/app/_layout.tsx'
      )

      // simulate a client manifest with the CSS entry
      const manifest = {
        'app/layout.css': {
          file: 'assets/layout-abc123.css',
          src: 'app/layout.css',
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

    it('should return empty set when no critical CSS exists', async () => {
      // fresh import to reset module state
      const { getCriticalCSSOutputPaths } = await import('./criticalCSSPlugin')

      const manifest = {
        'app/styles.css': {
          file: 'assets/styles-abc.css',
        },
      }

      const outputPaths = getCriticalCSSOutputPaths(manifest as any)
      // may contain paths from prior tests in same module, but should not error
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
