import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

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

      ;(plugin.configResolved as any)({ root: '/project' })

      const result = await (plugin.resolveId as any).call(
        { resolve: vi.fn() },
        './styles.css',
        '/project/src/App.tsx'
      )
      expect(result).toBeNull()
    })

    it('should return null for non-css imports', async () => {
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

    it('should resolve .inline.css and track it', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue({
        id: '/project/src/styles.inline.css',
      })

      const result = await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './styles.inline.css',
        '/project/src/App.tsx'
      )

      expect(mockResolve).toHaveBeenCalledWith(
        './styles.inline.css',
        '/project/src/App.tsx',
        { skipSelf: true }
      )

      expect(result).toEqual({ id: '/project/src/styles.inline.css' })
    })

    it('should track inline CSS source paths', async () => {
      const { criticalCSSPlugin, getCriticalCSSSources } = await import(
        './criticalCSSPlugin'
      )
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue({
        id: '/project/src/layout.inline.css',
      })

      await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './layout.inline.css',
        '/project/src/App.tsx'
      )

      const sources = getCriticalCSSSources()
      expect(sources.has('src/layout.inline.css')).toBe(true)
    })

    it('should return null when resolve fails', async () => {
      const { criticalCSSPlugin } = await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue(null)

      const result = await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './nonexistent.inline.css',
        '/project/src/App.tsx'
      )

      expect(result).toBeNull()
    })
  })

  describe('getCriticalCSSOutputPaths', () => {
    it('should map inline CSS source to output paths via manifest', async () => {
      const { criticalCSSPlugin, getCriticalCSSSources, getCriticalCSSOutputPaths } =
        await import('./criticalCSSPlugin')
      const plugin = criticalCSSPlugin()

      ;(plugin.configResolved as any)({ root: '/project' })

      const mockResolve = vi.fn().mockResolvedValue({
        id: '/project/app/layout.inline.css',
      })
      await (plugin.resolveId as any).call(
        { resolve: mockResolve },
        './layout.inline.css',
        '/project/app/_layout.tsx'
      )

      const manifest = {
        'app/layout.inline.css': {
          file: 'assets/layout-abc123.css',
          src: 'app/layout.inline.css',
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
