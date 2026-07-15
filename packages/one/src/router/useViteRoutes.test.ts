import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hmrImport: vi.fn(),
}))

vi.mock('./hmrImport', () => ({
  hmrImport: mocks.hmrImport,
}))

import { globbedRoutesToRouteContext } from './useViteRoutes'

const realWindow = (globalThis as any).window

afterEach(() => {
  vi.unstubAllEnvs()
  mocks.hmrImport.mockReset()
  ;(globalThis as any).window = realWindow
})

async function resolveRoute(context: ReturnType<typeof globbedRoutesToRouteContext>) {
  try {
    return context('./index.tsx')
  } catch (pending) {
    await pending
    return context('./index.tsx')
  }
}

describe('globbedRoutesToRouteContext HMR', () => {
  it('evicts and reloads a route under a custom router root', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    ;(globalThis as any).window = {}
    const initialRoute = { default: () => 'initial' }
    const updatedRoute = { default: () => 'updated' }
    const context = globbedRoutesToRouteContext(
      { '/routes/index.tsx': () => Promise.resolve(initialRoute) },
      'routes'
    )

    await expect(resolveRoute(context)).resolves.toBe(initialRoute)

    mocks.hmrImport.mockResolvedValue(updatedRoute)
    ;(globalThis as any).window.__oneRouteCache.clearFile('routes/index.tsx')

    await expect(resolveRoute(context)).resolves.toBe(updatedRoute)
    expect(mocks.hmrImport).toHaveBeenCalledWith('/routes/index.tsx')
  })
})
