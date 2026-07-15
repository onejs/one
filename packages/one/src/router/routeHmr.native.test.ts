import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

type RouteHmrModule = typeof import('./routeHmr.native')

describe('routeHmr.native', () => {
  let routeHmr: RouteHmrModule
  const realWindow = (globalThis as any).window

  beforeEach(async () => {
    // the __VXRN_ON_MODULE_UPDATED__ registration is dev-gated and runs at module
    // load, so stub NODE_ENV then re-import to exercise it
    vi.stubEnv('NODE_ENV', 'development')
    vi.resetModules()
    routeHmr = await import('./routeHmr.native')
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    globalThis.__VXRN_ON_MODULE_UPDATED__ = undefined
    ;(globalThis as any).window = realWindow
  })

  it('registers globalThis.__VXRN_ON_MODULE_UPDATED__ in development', () => {
    expect(typeof globalThis.__VXRN_ON_MODULE_UPDATED__).toBe('function')
  })

  it('bumps the epoch and notifies subscribers, and stops after unsubscribe', () => {
    const before = routeHmr.getRouteHmrEpoch()
    const listener = vi.fn()
    const unsubscribe = routeHmr.subscribeRouteHmr(listener)

    globalThis.__VXRN_ON_MODULE_UPDATED__!('app/index.tsx')
    expect(routeHmr.getRouteHmrEpoch()).toBe(before + 1)
    expect(listener).toHaveBeenCalledTimes(1)

    unsubscribe()
    globalThis.__VXRN_ON_MODULE_UPDATED__!('app/index.tsx')
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('evicts the route cache for the updated file when window.__oneRouteCache is present', () => {
    const clearFile = vi.fn()
    ;(globalThis as any).window = { __oneRouteCache: { clearFile } }
    globalThis.__VXRN_ON_MODULE_UPDATED__!('app/_layout.tsx')
    expect(clearFile).toHaveBeenCalledWith('app/_layout.tsx')
  })

  it('does not throw when window / route cache is absent', () => {
    ;(globalThis as any).window = undefined
    expect(() => globalThis.__VXRN_ON_MODULE_UPDATED__!('x.tsx')).not.toThrow()
  })
})
