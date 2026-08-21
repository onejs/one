import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Platform-correct test paths — resolve() normalizes to native separators
const PROJECT_ROOT = resolve('/project')
const PUBLIC_DIR = resolve('/project/public')
const COMPONENTS_DIR = resolve('/project/src/components')
const HERO_FILE = resolve('/project/src/components/Hero.tsx')

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

function mockConfig() {
  return {
    publicDir: PUBLIC_DIR,
    root: PROJECT_ROOT,
  }
}

describe('imageDataPlugin', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('resolveId', () => {
    // these ids are now rejected by the rust-side hook filter, so the handler
    // never runs for them. assert the filter itself does that.
    it('filters out ids without a trailing ?imagedata', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()
      const filter = (plugin.resolveId as any).filter.id as RegExp

      expect(filter.test('./image.jpg')).toBe(false)
      // ?imagedata in the middle should not match
      expect(filter.test('./image?imagedata.jpg')).toBe(false)
      expect(filter.test('./image.jpg?imagedata')).toBe(true)
    })

    it('should resolve public dir paths starting with /', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const result = await (plugin.resolveId as any).handler(
        '/test-image.jpg?imagedata',
        undefined
      )
      expect(result).toBe('\0imagedata:' + resolve(PUBLIC_DIR, 'test-image.jpg'))
    })

    it('should resolve relative imports', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const result = await (plugin.resolveId as any).handler(
        './test-image.jpg?imagedata',
        HERO_FILE
      )
      expect(result).toBe('\0imagedata:' + resolve(COMPONENTS_DIR, 'test-image.jpg'))
    })

    it('should return null for non-existent files', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const result = await (plugin.resolveId as any).handler(
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

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const result = await (plugin.resolveId as any).handler(
        '/../../../etc/passwd?imagedata',
        undefined
      )
      expect(result).toBeNull()
    })

    it('should block path traversal from relative imports', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const result = await (plugin.resolveId as any).handler(
        '../../../../etc/passwd?imagedata',
        HERO_FILE
      )
      expect(result).toBeNull()
    })

    it('should block path traversal from root', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const result = await (plugin.resolveId as any).handler(
        '../../../etc/passwd?imagedata',
        undefined
      )
      expect(result).toBeNull()
    })

    it('should allow paths within project boundaries', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      // Going up and back down should still work if within bounds
      // From /project/src/components, ../.. goes to /project, then src/test-image.jpg
      const result = await (plugin.resolveId as any).handler(
        '../../src/test-image.jpg?imagedata',
        HERO_FILE
      )
      expect(result).toBe('\0imagedata:' + resolve(PROJECT_ROOT, 'src/test-image.jpg'))
    })
  })

  describe('load', () => {
    it('filters out non-virtual modules before the handler runs', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()
      const filter = (plugin.load as any).filter.id as RegExp

      expect(filter.test('./image.jpg')).toBe(false)
      expect(filter.test('\0imagedata:/abs/path/image.jpg')).toBe(true)
    })

    it('should return fallback data when sharp fails', async () => {
      const { imageDataPlugin } = await import('./imageDataPlugin')
      const plugin = imageDataPlugin()

      if (plugin.configResolved) {
        ;(plugin.configResolved as any)(mockConfig())
      }

      const mockContext = {
        addWatchFile: vi.fn(),
      }

      const testFilePath = resolve(PUBLIC_DIR, 'test-image.jpg')

      // This will fail because the file doesn't actually exist
      // But it should gracefully fallback
      const result = await (plugin.load as any).handler.call(
        mockContext,
        '\0imagedata:' + testFilePath
      )

      expect(result).toContain('export default')
      expect(result).toContain('"src":"/test-image.jpg"')
      expect(result).toContain('"width":')
      expect(result).toContain('"height":')
      expect(mockContext.addWatchFile).toHaveBeenCalledWith(testFilePath)
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

    if (plugin.configResolved) {
      ;(plugin.configResolved as any)(mockConfig())
    }

    const mockContext = {
      addWatchFile: vi.fn(),
    }

    const testFilePath = resolve(PUBLIC_DIR, 'test-image.jpg')

    const result = await (plugin.load as any).handler.call(
      mockContext,
      '\0imagedata:' + testFilePath
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
