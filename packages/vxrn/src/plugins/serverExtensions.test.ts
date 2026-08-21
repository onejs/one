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

// vite's config hook destructures `command` from arg 2
const SERVE_HOOK_OPTS = { command: 'serve' as const, mode: 'development' }

function createMockContext(envName: string, resolvedId?: string) {
  return {
    resolve: vi.fn().mockResolvedValue(resolvedId ? { id: resolvedId } : null),
    environment: { name: envName },
  }
}

describe('platform-specific-resolve', () => {
  describe('.server extension', () => {
    // extensionless imports are resolved to their platform variant by vite's
    // own resolve.extensions (asserted in 'config extensions' below), so the
    // hook filter drops them before any js runs. this hook now only exists for
    // imports that already carry an extension, which resolve.extensions cannot
    // rewrite because it only appends.
    it('filters out extensionless sources, leaving them to resolve.extensions', async () => {
      const plugin = await getPlatformResolvePlugin()
      const filter = (plugin.resolveId as any).filter.id as RegExp

      expect(filter.test('./db')).toBe(false)
      expect(filter.test('react')).toBe(false)
      // still reaches js: already has an extension, or is a bare .server import
      expect(filter.test('./db.js')).toBe(true)
      expect(filter.test('./test-web.js')).toBe(true)
      expect(filter.test('./db.server')).toBe(true)
    })

    it('prefers a platform sibling for an import that already has an extension', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = (plugin.resolveId as any).handler as Function

      existsSyncMock.mockImplementation((path: any) => {
        return String(path).includes('.web.')
      })

      // no ctx.resolve call is needed: a relative source with an extension
      // resolves to a path the hook computes directly
      const ctx = createMockContext('client')
      const result = await resolveId.call(ctx, './db.ts', '/src/app.tsx', {})

      expect(result).toEqual({ id: '/src/db.web.ts' })
      expect(ctx.resolve).not.toHaveBeenCalled()

      vi.restoreAllMocks()
    })

    it('stubs .server file when explicitly imported on client', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = (plugin.resolveId as any).handler as Function

      const ctx = createMockContext('client', '/src/db.server.ts')

      const result = await resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      expect(result).toEqual({ id: '\0server-only-stub:./db.server' })
    })

    it('stubs .server file when explicitly imported on ios', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = (plugin.resolveId as any).handler as Function

      const ctx = createMockContext('ios', '/src/db.server.ts')

      const result = await resolveId.call(ctx, './db.server', '/src/page.tsx', {})
      expect(result).toEqual({ id: '\0server-only-stub:./db.server' })
    })

    it('allows .server file import on ssr', async () => {
      const plugin = await getPlatformResolvePlugin()
      const resolveId = (plugin.resolveId as any).handler as Function

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
