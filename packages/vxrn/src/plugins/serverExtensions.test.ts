import { describe, expect, it, vi } from 'vitest'
import type { PluginOption } from 'vite'

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

function createMockContext(envName: string, resolvedId?: string) {
  return {
    resolve: vi.fn().mockResolvedValue(
      resolvedId ? { id: resolvedId } : null
    ),
    environment: { name: envName },
  }
}

describe('platform-specific-resolve', () => {
  describe('.server extension', () => {
    it('ssr resolves .server files', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      const FSExtra = await import('fs-extra')
      vi.spyOn(FSExtra.default, 'pathExists').mockImplementation(async (path: any) => {
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

      const FSExtra = await import('fs-extra')
      vi.spyOn(FSExtra.default, 'pathExists').mockImplementation(async (path: any) => {
        return String(path).includes('.web.')
      })

      const ctx = createMockContext('client', '/src/db.ts')
      const result = await resolveId.call(ctx, './db', '/src/app.tsx', {})

      expect(result).toEqual({ id: '/src/db.web.ts' })

      vi.restoreAllMocks()
    })

    it('errors when .server file is explicitly imported on client', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      const ctx = createMockContext('client', '/src/db.server.ts')

      await expect(
        resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      ).rejects.toThrow('.server file cannot be imported on client')
    })

    it('errors when .server file is explicitly imported on ios', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      const ctx = createMockContext('ios', '/src/db.server.ts')

      await expect(
        resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      ).rejects.toThrow('.server file cannot be imported on ios')
    })

    it('allows .server file import on ssr', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = plugin.resolveId as Function

      const FSExtra = await import('fs-extra')
      vi.spyOn(FSExtra.default, 'pathExists').mockResolvedValue(false as any)

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
      const config = (plugin.config as Function)()

      const ssrExts = config.environments.ssr.resolve.extensions
      expect(ssrExts).toContain('.server.ts')
      expect(ssrExts).toContain('.server.tsx')
      expect(ssrExts).toContain('.web.ts')
    })

    it('client does not include .server extensions', async () => {
      const plugin = await getPlatformResolvePlugin()
      const config = (plugin.config as Function)()

      const clientExts = config.environments.client.resolve.extensions
      expect(clientExts).not.toContain('.server.ts')
      expect(clientExts).not.toContain('.server.tsx')
    })
  })
})
