import { describe, expect, it, vi } from 'vitest'
import type { PluginOption } from 'vite'

// vi.spyOn on `node:fs` exports throws in ESM; use vi.mock factory instead
const existsSyncMock = vi.fn<(path: any) => boolean>(() => false)
vi.mock('node:fs', async (importOriginal) => {
  const original = (await importOriginal()) as object
  return { ...original, existsSync: (path: any) => existsSyncMock(path) }
})

async function getPlatformResolvePlugin() {
  const { getBaseVitePlugins } = await import('../config/getBaseVitePlugins')
  const plugins = getBaseVitePlugins() as PluginOption[]

  const plugin = plugins.find(
    (p) =>
      typeof p === 'object' &&
      p !== null &&
      'name' in p &&
      p.name === 'platform-specific-resolve'
  )

  if (!plugin || typeof plugin !== 'object' || !('resolveId' in plugin)) {
    throw new Error('platform-specific-resolve plugin not found')
  }

  return plugin
}

// Vite's config hook destructures `command` from arg 2
const SERVE_HOOK_OPTS = { command: 'serve' as const, mode: 'development' }

function createMockContext(envName: string, resolvedId?: string) {
  return {
    resolve: vi.fn().mockResolvedValue(resolvedId ? { id: resolvedId } : null),
    environment: { name: envName },
  }
}

describe('platform-specific-resolve', () => {
  describe('.server extension', () => {
    it('ssr resolves .server files', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      existsSyncMock.mockImplementation((path: any) => {
        return String(path).includes('.server.')
      })

      const ctx = createMockContext('ssr', '/src/db.ts')
      const result = await resolveId.call(ctx, './db', '/src/app.tsx', {})

      expect(result).toEqual({ id: '/src/db.server.ts' })

      vi.restoreAllMocks()
    })

    it('client does not resolve .server files', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      existsSyncMock.mockImplementation((path: any) => {
        return String(path).includes('.web.')
      })

      const ctx = createMockContext('client', '/src/db.ts')
      const result = await resolveId.call(ctx, './db', '/src/app.tsx', {})

      expect(result).toEqual({ id: '/src/db.web.ts' })

      vi.restoreAllMocks()
    })

    it('stubs .server file when explicitly imported on client', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      const ctx = createMockContext('client', '/src/db.server.ts')

      const result = await resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      expect(result).toEqual({ id: '\0server-only-stub:./db.server' })
    })

    it('stubs .server file when explicitly imported on ios', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      const ctx = createMockContext('ios', '/src/db.server.ts')

      const result = await resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      expect(result).toEqual({ id: '\0server-only-stub:./db.server' })
    })

    it('allows .server file import on ssr', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      existsSyncMock.mockReturnValue(false)

      const ctx = createMockContext('ssr', '/src/db.server.ts')
      // should not throw
      const result = await resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      expect(result).toBeUndefined()

      vi.restoreAllMocks()
    })
  })

  describe('config extensions', () => {
    it('ssr includes .server extensions', async () => {
      const plugin = await getPlatformResolvePlugin()
      const config = (plugin.config as Function)({}, SERVE_HOOK_OPTS)

      const ssrExts = config.environments.ssr.resolve.extensions
      expect(ssrExts).toContain('.server.ts')
      expect(ssrExts).toContain('.server.tsx')
      expect(ssrExts).toContain('.web.ts')
    })

    it('client does not include .server extensions', async () => {
      const plugin = await getPlatformResolvePlugin()
      const config = (plugin.config as Function)({}, SERVE_HOOK_OPTS)

      const clientExts = config.environments.client.resolve.extensions
      expect(clientExts).not.toContain('.server.ts')
      expect(clientExts).not.toContain('.server.tsx')
    })
  })
})
