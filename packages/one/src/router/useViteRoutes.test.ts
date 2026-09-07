import { afterEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  hmrImport: vi.fn(),
  diagnoseRouteLoadFailure: vi.fn(),
}))

vi.mock('./hmrImport', () => ({
  hmrImport: mocks.hmrImport,
}))

vi.mock('./diagnoseRouteLoadFailure', () => ({
  diagnoseRouteLoadFailure: mocks.diagnoseRouteLoadFailure,
}))

import { globbedRoutesToRouteContext } from './useViteRoutes'

const realWindow = (globalThis as any).window

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
  mocks.hmrImport.mockReset()
  mocks.diagnoseRouteLoadFailure.mockReset()
  ;(globalThis as any).window = realWindow
})

describe('route load error diagnostics', () => {
  it.each(['native', 'server', 'web shim', 'browser'])(
    '%s preserves the original route error',
    async (environment) => {
      vi.stubEnv('NODE_ENV', 'development')
      vi.stubEnv('TAMAGUI_TARGET', environment === 'native' ? 'native' : 'web')
      vi.stubGlobal(
        'window',
        environment === 'server'
          ? undefined
          : environment === 'browser'
            ? {
                history: {},
                location: { href: 'http://localhost/', origin: 'http://localhost' },
              }
            : {}
      )
      const report = vi.fn()
      vi.stubGlobal('__oneReportRouteLoadError', report)
      vi.spyOn(console, 'error').mockImplementation(() => {})
      mocks.diagnoseRouteLoadFailure.mockResolvedValue(null)
      vi.resetModules()
      const { globbedRoutesToRouteContext } = await import('./useViteRoutes')
      const error = new Error('original route failure')
      const context = globbedRoutesToRouteContext(
        { '/app/index.tsx': () => Promise.reject(error) },
        'app'
      )

      const route = await resolveRoute(context)

      expect(route.default()).toBeNull()
      expect(report).toHaveBeenCalledExactlyOnceWith({
        id: './index.tsx',
        message: error.message,
        stack: error.stack,
      })
      if (environment === 'browser') {
        expect(mocks.diagnoseRouteLoadFailure).toHaveBeenCalledExactlyOnceWith(
          './index.tsx',
          '/app/index.tsx'
        )
      } else {
        expect(mocks.diagnoseRouteLoadFailure).not.toHaveBeenCalled()
      }
    }
  )

  it('keeps the original report when a browser diagnostic rejects', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('TAMAGUI_TARGET', 'web')
    vi.stubGlobal('window', {
      history: {},
      location: { href: 'http://localhost/', origin: 'http://localhost' },
    })
    const report = vi.fn()
    vi.stubGlobal('__oneReportRouteLoadError', report)
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mocks.diagnoseRouteLoadFailure.mockRejectedValue(new Error('diagnostic failed'))
    vi.resetModules()
    const { globbedRoutesToRouteContext } = await import('./useViteRoutes')
    const error = new Error('original route failure')
    const context = globbedRoutesToRouteContext(
      { '/app/index.tsx': () => Promise.reject(error) },
      'app'
    )

    const route = await resolveRoute(context)
    await new Promise((resolve) => setImmediate(resolve))

    expect(route.default()).toBeNull()
    expect(report).toHaveBeenCalledExactlyOnceWith({
      id: './index.tsx',
      message: error.message,
      stack: error.stack,
    })
    expect(mocks.diagnoseRouteLoadFailure).toHaveBeenCalledExactlyOnceWith(
      './index.tsx',
      '/app/index.tsx'
    )
  })
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
