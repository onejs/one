import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock fs before importing the plugin
vi.mock('node:fs', async () => {
  const actual = await vi.importActual('node:fs')
  return {
    ...actual,
    existsSync: vi.fn((path: string) => {
      return path.includes('test-image.jpg') || path.includes('hero.png')
    }),
  }
})

describe('imageDataPlugin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveId', () => {
    it('should return null for non-imagedata imports', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)('./image.jpg', undefined)
      expect(result).toBeNull()
    })

    it('should return null for imports with imagedata not as suffix', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      // ?imagedata in the middle should not match
      const result = await (plugin.resolveId as any)('./image?imagedata.jpg', undefined)
      expect(result).toBeNull()
    })

    it('should resolve public dir paths starting with /', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)(
        '/test-image.jpg?imagedata',
        undefined
      )
      expect(result).toBe('\0imagedata:/project/public/test-image.jpg')
    })

    it('should resolve relative imports', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)(
        './test-image.jpg?imagedata',
        '/project/src/components/Hero.tsx'
      )
      expect(result).toBe('\0imagedata:/project/src/components/test-image.jpg')
    })

    it('should return null for non-existent files', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)(
        '/nonexistent.jpg?imagedata',
        undefined
      )
      expect(result).toBeNull()
    })
  })

  describe('path traversal prevention', () => {
    it('should block path traversal from public dir', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)(
        '/../../../etc/passwd?imagedata',
        undefined
      )
      expect(result).toBeNull()
    })

    it('should block path traversal from relative imports', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)(
        '../../../../etc/passwd?imagedata',
        '/project/src/components/Hero.tsx'
      )
      expect(result).toBeNull()
    })

    it('should block path traversal from root', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const result = await (plugin.resolveId as any)(
        '../../../etc/passwd?imagedata',
        undefined
      )
      expect(result).toBeNull()
    })

    it('should allow paths within project boundaries', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      // Going up and back down should still work if within bounds
      // From /project/src/components, ../.. goes to /project, then src/test-image.jpg
      const result = await (plugin.resolveId as any)(
        '../../src/test-image.jpg?imagedata',
        '/project/src/components/Hero.tsx'
      )
      expect(result).toBe('\0imagedata:/project/src/test-image.jpg')
    })
  })

  describe('load', () => {
    it('should return null for non-virtual modules', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const mockContext = {
        addWatchFile: vi.fn(),
      }

      const result = await (plugin.load as any).call(mockContext, './image.jpg')
      expect(result).toBeNull()
    })

    it('should return fallback data when sharp fails', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      const mockConfig = {
        publicDir: '/project/public',
        root: '/project',
      }

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig)
      }

      const mockContext = {
        addWatchFile: vi.fn(),
      }

      // This will fail because the file doesn't actually exist
      // But it should gracefully fallback
      const result = await (plugin.load as any).call(
        mockContext,
        '\0imagedata:/project/public/test-image.jpg'
      )

      expect(result).toContain('export default')
      expect(result).toContain('"src":"/test-image.jpg"')
      expect(result).toContain('"width":')
      expect(result).toContain('"height":')
      expect(mockContext.addWatchFile).toHaveBeenCalledWith(
        '/project/public/test-image.jpg'
      )
    })
  })

  describe('plugin metadata', () => {
    it('should have correct name', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()
      expect(plugin.name).toBe('one:imagedata')
    })

    it('should enforce pre', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()
      expect(plugin.enforce).toBe('pre')
    })
  })
})

describe('imageDataPlugin output format', () => {
  it('should export a valid JSON object', async () => {
    vi.resetModules()

    const { imageDataPlugin } = await import('./imageDataPlugin')
    const plugin = imageDataPlugin()

    const mockConfig = {
      publicDir: '/project/public',
      root: '/project',
    }

    if (plugin.configResolved) {
      ;(plugin.configResolved as any)(mockConfig)
    }

    const mockContext = {
      addWatchFile: vi.fn(),
    }

    const result = await (plugin.load as any).call(
      mockContext,
      '\0imagedata:/project/public/test-image.jpg'
    )

    // Extract JSON from the export
    const jsonMatch = result?.match(/export default (.+)$/)
    expect(jsonMatch).toBeTruthy()

    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[1])
      expect(parsed).toHaveProperty('src')
      expect(parsed).toHaveProperty('width')
      expect(parsed).toHaveProperty('height')
      expect(parsed).toHaveProperty('blurDataURL')
      expect(typeof parsed.src).toBe('string')
      expect(typeof parsed.width).toBe('number')
      expect(typeof parsed.height).toBe('number')
      expect(typeof parsed.blurDataURL).toBe('string')
    }
  })
})
