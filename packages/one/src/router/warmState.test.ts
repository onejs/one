import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNavigationContainerRef } from '@react-navigation/core'
import { getRoutes } from './getRoutes'
import { initialize, initialState, routeInfoSnapshot } from './router'
import { getPreloadedModule } from './useViteRoutes'
import {
  clearWarmState,
  configureWarmState,
  consumeWarmInitialNavigationState,
  consumeWarmRouteApplied,
  flushWarmState,
  getHydratedWarmState,
  hydrateWarmInitialLoad,
  isWarmRouteApplied,
  isWarmRoutePreloadPending,
  matchRoutePattern,
  normalizeHref,
  normalizeRoutePattern,
  reconcileNativeColdDeepLink,
  registerWarmStateSource,
  scheduleWarmStatePersist,
  waitForWarmRoutePreload,
  type WarmNavigationSnapshot,
  type WarmStateStorage,
} from './warmState'
import { LaunchScreenRelease } from './LaunchScreenRelease'
import { WARM_STATE_STORAGE_KEY } from './warmStateShared'

function createMemoryStorage(initial?: Record<string, string>): WarmStateStorage & {
  writes: string[]
  removals: string[]
  raw: Map<string, string>
} {
  const raw = new Map<string, string>(Object.entries(initial ?? {}))
  const writes: string[] = []
  const removals: string[] = []
  return {
    raw,
    writes,
    removals,
    getItem: (key) => raw.get(key) ?? null,
    setItem: (key, value) => {
      raw.set(key, value)
      writes.push(value)
    },
    removeItem: (key) => {
      raw.delete(key)
      removals.push(key)
    },
  }
}

async function flushMicrotasks(turns = 5): Promise<void> {
  for (let i = 0; i < turns; i++) {
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
  }
}

function makeTestRouteNode() {
  const files: Record<string, any> = {
    './index.tsx': { default: () => null },
    './inbox.tsx': { default: () => null },
    '/app/settings.tsx': { default: () => null },
  }
  const ctx = ((id: string) => files[id]) as any
  ctx.keys = () => Object.keys(files)
  ctx.resolve = (id: string) => id
  ctx.id = 'test'
  return getRoutes(ctx)
}

describe('warmState', () => {
  let nowMs = 1_000_000
  let storage: ReturnType<typeof createMemoryStorage>

  beforeEach(() => {
    vi.stubEnv('TAMAGUI_TARGET', 'native')
    nowMs = 1_000_000
    storage = createMemoryStorage()
    clearWarmState()
    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      maxAgeMs: 60_000,
      restoreRoute: true,
      restoreWebRoute: true,
      preloadRoutes: true,
      storage,
      now: () => nowMs,
    })
  })

  afterEach(() => {
    clearWarmState()
    vi.unstubAllEnvs()
    delete globalThis['__importMetaGlobbed']
  })

  it('rejects corrupt, mismatched schemaVersion, or expired snapshots at storage boundary', () => {
    storage.raw.set(WARM_STATE_STORAGE_KEY, '{not valid json')
    expect(hydrateWarmInitialLoad()).toBeNull()
    expect(storage.removals).toContain(WARM_STATE_STORAGE_KEY)

    clearWarmState({ keepConfig: true })
    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({ v: 1, schemaVersion: 1, updatedAt: nowMs, sources: {} })
    )
    expect(getHydratedWarmState()).toBeNull()
    expect(storage.raw.has(WARM_STATE_STORAGE_KEY)).toBe(false)

    clearWarmState({ keepConfig: true })
    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({ v: 1, schemaVersion: 2, updatedAt: nowMs - 60_001, sources: {} })
    )
    expect(getHydratedWarmState()).toBeNull()
    expect(storage.raw.has(WARM_STATE_STORAGE_KEY)).toBe(false)
  })

  it('serializes latest state asynchronously, strips runtime keys, and flushes dirty state once on background', async () => {
    let tab = 'inbox'
    registerWarmStateSource('ui', {
      getSnapshot: () => ({ tab, filter: () => 'ignored' }),
      hydrate: () => {},
    })

    scheduleWarmStatePersist(
      {
        index: 0,
        key: 'stack-1',
        stale: false,
        routes: [
          {
            name: 'inbox',
            key: 'route-1',
            params: { thread: 'a', fn: () => {} },
          },
        ],
      },
      '/inbox'
    )

    tab = 'unread'
    scheduleWarmStatePersist(
      {
        index: 0,
        key: 'stack-2',
        stale: false,
        routes: [{ name: 'inbox', key: 'route-2', params: { thread: 'b' } }],
      },
      '/inbox?thread=b'
    )

    // Latest update wins without writing stale intermediate revisions once async turn settles
    await flushMicrotasks()
    expect(storage.writes.length).toBeGreaterThanOrEqual(1)
    const persisted = JSON.parse(storage.raw.get(WARM_STATE_STORAGE_KEY)!)
    expect(persisted.v).toBe(1)
    expect(persisted.schemaVersion).toBe(2)
    expect(persisted.pathname).toBe('/inbox?thread=b')
    expect(persisted.state).toEqual({
      index: 0,
      routes: [{ name: 'inbox', params: { thread: 'b' } }],
    })
    expect(persisted.sources.ui).toEqual({ tab: 'unread' })

    // Synchronous background flush writes immediately and avoids redundant second write
    tab = 'archived'
    scheduleWarmStatePersist()
    const writesBeforeFlush = storage.writes.length
    expect(flushWarmState()).toBe(true)
    expect(storage.writes.length).toBe(writesBeforeFlush + 1)
    expect(JSON.parse(storage.raw.get(WARM_STATE_STORAGE_KEY)!).sources.ui).toEqual({
      tab: 'archived',
    })
    expect(flushWarmState()).toBe(false)
    await flushMicrotasks()
    expect(storage.writes.length).toBe(writesBeforeFlush + 1)
  })

  it('hydrates eager and lazy sources synchronously and preloads saved route modules', async () => {
    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs - 1000,
        pathname: '/inbox',
        sources: {
          eager: { workspaceId: 'ws-9' },
          lazy: { draft: 'hello' },
        },
      })
    )

    let hydratedEager: unknown = null
    registerWarmStateSource('eager', {
      getSnapshot: () => hydratedEager,
      hydrate: (val) => {
        hydratedEager = val
      },
    })

    const inboxModule = { default: () => 'inbox' }
    const settingsModule = { default: () => 'settings' }
    const routes = {
      '/app/inbox.tsx': vi.fn(async () => inboxModule),
      '/app/settings.tsx': vi.fn(async () => settingsModule),
    }

    const env = hydrateWarmInitialLoad({ routes })
    expect(env?.pathname).toBe('/inbox')
    expect(hydratedEager).toEqual({ workspaceId: 'ws-9' })

    await flushMicrotasks()
    expect(routes['/app/inbox.tsx']).toHaveBeenCalledTimes(1)
    expect(routes['/app/settings.tsx']).not.toHaveBeenCalled()
    expect(getPreloadedModule('/app/inbox.tsx')).toBe(inboxModule)

    // Lazy source registered after boot still hydrates synchronously from cached envelope
    let hydratedLazy: unknown = null
    registerWarmStateSource('lazy', {
      getSnapshot: () => hydratedLazy,
      hydrate: (val) => {
        hydratedLazy = val
      },
      validate: (val): val is { draft: string } =>
        typeof val === 'object' &&
        val !== null &&
        typeof (val as any).draft === 'string',
    })
    expect(hydratedLazy).toEqual({ draft: 'hello' })
  })

  it('validates route names against screens (allowing root empty-string index) and rejects stale routes', () => {
    const routeNode = makeTestRouteNode()
    const linking = {
      prefixes: ['myapp://'],
      config: {
        screens: {
          index: '',
          inbox: 'inbox',
          settings: 'settings',
        },
      },
    }

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/',
        state: { index: 0, routes: [{ name: 'index' }] },
        sources: {},
      })
    )

    const rootRestored = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(rootRestored).toEqual({ index: 0, routes: [{ name: 'index' }] })
    expect(consumeWarmRouteApplied()).toBe(true)
    expect(consumeWarmRouteApplied()).toBe(false)

    clearWarmState({ keepConfig: true })
    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/removed-screen',
        state: { index: 0, routes: [{ name: 'removed-screen' }] },
        sources: {},
      })
    )
    expect(consumeWarmInitialNavigationState(routeNode, linking as any)).toBeUndefined()
    expect(storage.raw.has(WARM_STATE_STORAGE_KEY)).toBe(false)
  })


  it('restores initialState synchronously during native initialize() when warm state is valid', () => {
    const files: Record<string, any> = {
      './_layout.tsx': { default: () => null },
      './index.tsx': { default: () => null },
      './inbox.tsx': { default: () => null },
    }
    const ctx = ((id: string) => files[id]) as any
    ctx.keys = () => Object.keys(files)
    ctx.resolve = (id: string) => id
    ctx.id = 'warm-router-init'

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/inbox',
        state: { index: 0, routes: [{ name: 'inbox', path: '/inbox' }] },
        sources: {},
      })
    )

    const ref = createNavigationContainerRef()
    initialize(ctx, ref as any, undefined)

    expect(initialState).toEqual({
      index: 0,
      routes: [{ name: 'inbox', path: '/inbox' }],
    })
    expect(routeInfoSnapshot().pathname).toBe('/inbox')
  })

  it('normalizes hrefs and compares full hrefs including queries and hashes', async () => {
    // 1. Verify normalizeHref hash and query splitting
    expect(normalizeHref('/inbox/#section')).toBe('/inbox#section')
    expect(normalizeHref('/inbox#section')).toBe('/inbox#section')
    expect(normalizeHref('/inbox/?tab=all#section')).toBe('/inbox?tab=all#section')
    expect(normalizeHref('/inbox?tab=all#section')).toBe('/inbox?tab=all#section')
    expect(normalizeHref('/inbox/')).toBe('/inbox')
    expect(normalizeHref('/')).toBe('/')

    const navigateTo = vi.fn()

    // 2. Springboard launch: null launch URL leaves warm screen untouched
    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => null,
        prefixes: ['myapp://'],
        currentHref: '/inbox?thread=a',
        navigateTo,
      })
    ).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()

    // 3. Same-href launch: incoming deep link matches current full href exactly
    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => 'myapp://inbox?thread=a',
        prefixes: ['myapp://'],
        currentHref: '/inbox?thread=a',
        navigateTo,
      })
    ).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()

    // 4. Hash match no-op: /inbox/#section matches /inbox#section
    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => 'myapp://inbox/#section',
        prefixes: ['myapp://'],
        currentHref: '/inbox#section',
        navigateTo,
      })
    ).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()

    // 5. Query change override: bare path matches /inbox, but query param differs (?thread=b vs ?thread=a)
    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => 'myapp://inbox?thread=b',
        prefixes: ['myapp://'],
        currentHref: '/inbox?thread=a',
        navigateTo,
      })
    ).toBe('/inbox?thread=b')
    expect(navigateTo).toHaveBeenCalledWith('/inbox?thread=b')

    navigateTo.mockClear()

    // 6. Different path override: /settings?tab=audio vs /inbox
    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => 'myapp://settings?tab=audio',
        prefixes: ['myapp://'],
        currentHref: '/inbox',
        navigateTo,
      })
    ).toBe('/settings?tab=audio')
    expect(navigateTo).toHaveBeenCalledWith('/settings?tab=audio')
  })

  it('filters route restore with includeRoutes and excludeRoutes while preserving hydrated sources and storage', () => {
    const routeNode = makeTestRouteNode()
    const linking = {
      prefixes: ['myapp://'],
      config: {
        screens: {
          index: '',
          inbox: 'inbox',
          settings: 'settings',
        },
      },
    }

    let hydratedUser = ''
    registerWarmStateSource('user', {
      getSnapshot: () => ({ name: 'Alice' }),
      hydrate: (val: any) => {
        hydratedUser = val?.name ?? ''
      },
    })

    // Setup storage with saved /settings route and valid user source
    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/settings',
        state: { index: 0, routes: [{ name: 'settings' }] },
        sources: { user: { name: 'Alice' } },
      })
    )

    // includeRoutes: only /inbox and /feed/* are allowed
    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      includeRoutes: ['/inbox', '/feed/*'],
      storage,
      now: () => nowMs,
    })

    // /settings is not included in includeRoutes: route restore is skipped!
    const restored = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(restored).toBeUndefined()
    expect(consumeWarmRouteApplied()).toBe(false)
    // Sources MUST still hydrate!
    expect(hydratedUser).toBe('Alice')
    // Storage MUST remain intact!
    expect(storage.raw.has(WARM_STATE_STORAGE_KEY)).toBe(true)

    // Now test with an included route (/inbox)
    clearWarmState({ keepConfig: true })
    hydratedUser = ''
    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/inbox?thread=42',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: { user: { name: 'Alice' } },
      })
    )

    const inboxRestored = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(inboxRestored).toEqual({ index: 0, routes: [{ name: 'inbox' }] })
    expect(consumeWarmRouteApplied()).toBe(true)
    expect(hydratedUser).toBe('Alice')

    // Now test excludeRoutes winning over includeRoutes
    clearWarmState({ keepConfig: true })
    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      includeRoutes: ['/inbox', '/modal/*'],
      excludeRoutes: ['/modal/*'],
      storage,
      now: () => nowMs,
    })

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/modal/sheet',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: { user: { name: 'Bob' } },
      })
    )

    const modalRestored = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(modalRestored).toBeUndefined()
    expect(consumeWarmRouteApplied()).toBe(false)
    expect(hydratedUser).toBe('Bob')
    expect(storage.raw.has(WARM_STATE_STORAGE_KEY)).toBe(true)
  })

  it('supports alignRoute with single invocation caching, snapshot objects, and fallback paths', async () => {
    const routeNode = makeTestRouteNode()
    const linking = {
      prefixes: ['myapp://'],
      config: {
        screens: {
          index: '',
          inbox: 'inbox',
          settings: 'settings',
        },
      },
      getStateFromPath: (path: string) => {
        const clean = path.split('?')[0].replace(/^\//, '') || 'index'
        return { index: 0, routes: [{ name: clean }] }
      },
    }

    let hydratedCounter = 0
    registerWarmStateSource('counter', {
      getSnapshot: () => ({ count: 10 }),
      hydrate: (val: any) => {
        hydratedCounter = val?.count ?? 0
      },
    })

    // Case 1: alignRoute returning false skips route restore while keeping sources
    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      alignRoute: ({ pathname }) => {
        if (pathname.startsWith('/compose')) return false
        return true
      },
      storage,
      now: () => nowMs,
    })

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/compose/modal',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: { counter: { count: 99 } },
      })
    )

    expect(consumeWarmInitialNavigationState(routeNode, linking as any)).toBeUndefined()
    expect(consumeWarmRouteApplied()).toBe(false)
    expect(hydratedCounter).toBe(99)
    expect(storage.raw.has(WARM_STATE_STORAGE_KEY)).toBe(true)

    // Case 2: alignRoute is invoked exactly ONCE across preload and route consumption
    clearWarmState({ keepConfig: true })
    let alignCalls = 0
    const routes = {
      './inbox.tsx': async () => ({ default: () => null }),
      '/app/settings.tsx': async () => ({ default: () => null }),
    }

    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      preloadRoutes: true,
      alignRoute: ({ pathname }) => {
        alignCalls++
        if (pathname.startsWith('/compose')) return '/inbox?tab=all'
        return true
      },
      storage,
      now: () => nowMs,
    })

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/compose/new-message',
        state: { index: 0, routes: [{ name: 'settings' }] },
        sources: { counter: { count: 42 } },
      })
    )

    // Step A: preload during boot evaluates alignRoute once
    hydrateWarmInitialLoad({ routes })
    expect(alignCalls).toBe(1)

    // Step B: consuming state uses cached alignment without re-invoking alignRoute
    const aligned = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(alignCalls).toBe(1)
    expect(aligned).toEqual({ index: 0, routes: [{ name: 'inbox' }] })
    expect(consumeWarmRouteApplied()).toBe(true)
    expect(getHydratedWarmState()?.pathname).toBe('/inbox?tab=all')

    // Case 3: alignRoute returning custom WarmNavigationSnapshot object during preload & restore
    clearWarmState({ keepConfig: true })
    let preloadedSettings = false
    const snapshotRoutes = {
      '/app/settings.tsx': async () => {
        preloadedSettings = true
        return { default: () => null }
      },
    }

    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      preloadRoutes: true,
      alignRoute: () => ({ index: 0, routes: [{ name: 'settings', path: '/settings' }] }),
      storage,
      now: () => nowMs,
    })

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/unknown',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: {},
      })
    )

    hydrateWarmInitialLoad({ routes: snapshotRoutes })
    await waitForWarmRoutePreload(200)
    expect(preloadedSettings).toBe(true)

    const customAligned = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(customAligned).toEqual({ index: 0, routes: [{ name: 'settings', path: '/settings' }] })
    expect(consumeWarmRouteApplied()).toBe(true)
  })

  it('coordinates LaunchScreen hold timing until cold deep link reconciliation completes', async () => {
    const routeNode = makeTestRouteNode()
    const linking = {
      prefixes: ['myapp://'],
      config: {
        screens: {
          index: '',
          inbox: 'inbox',
        },
      },
    }

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/inbox?thread=a',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: {},
      })
    )

    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      storage,
      now: () => nowMs,
    })

    // Consume warm initial route
    const restored = consumeWarmInitialNavigationState(routeNode, linking as any)
    expect(restored).toBeDefined()
    expect(isWarmRouteApplied()).toBe(true)
    expect(consumeWarmRouteApplied()).toBe(true)
    expect(isWarmRouteApplied()).toBe(false)

    // Verify reconciliation execution order: navigateTo is called BEFORE reconciliation promise resolves
    const eventLog: string[] = []
    const navigateTo = vi.fn((href: string) => {
      eventLog.push(`navigateTo:${href}`)
    })

    const reconcilePromise = reconcileNativeColdDeepLink({
      getInitialURL: async () => {
        eventLog.push('getInitialURL:start')
        await new Promise((r) => setTimeout(r, 20))
        eventLog.push('getInitialURL:resolve')
        return 'myapp://inbox?thread=b'
      },
      prefixes: ['myapp://'],
      currentHref: '/inbox?thread=a',
      navigateTo,
    })

    expect(eventLog).toEqual(['getInitialURL:start'])
    const result = await reconcilePromise
    eventLog.push('reconcile:done')

    expect(result).toBe('/inbox?thread=b')
    expect(eventLog).toEqual([
      'getInitialURL:start',
      'getInitialURL:resolve',
      'navigateTo:/inbox?thread=b',
      'reconcile:done',
    ])
  })

  it('tracks in-flight warm route preloads with bounded helper and honors route exclusions', async () => {
    const routes = {
      './inbox.tsx': async () => {
        await new Promise((r) => setTimeout(r, 10))
        return { default: () => null }
      },
    }

    // 1. Included route preloads and is trackable
    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      preloadRoutes: true,
      includeRoutes: ['/inbox'],
      storage,
      now: () => nowMs,
    })

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/inbox',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: {},
      })
    )

    expect(isWarmRoutePreloadPending()).toBe(false)
    hydrateWarmInitialLoad({ routes, flags: { warmStart: { enabled: true, includeRoutes: ['/inbox'] } } })
    expect(isWarmRoutePreloadPending()).toBe(true)

    // Bounded wait resolves cleanly
    await waitForWarmRoutePreload(200)
    expect(isWarmRoutePreloadPending()).toBe(false)

    // 2. Excluded route does NOT start preload
    clearWarmState({ keepConfig: true })
    configureWarmState({
      enabled: true,
      schemaVersion: 2,
      preloadRoutes: true,
      excludeRoutes: ['/inbox'],
      storage,
      now: () => nowMs,
    })

    storage.raw.set(
      WARM_STATE_STORAGE_KEY,
      JSON.stringify({
        v: 1,
        schemaVersion: 2,
        updatedAt: nowMs,
        pathname: '/inbox',
        state: { index: 0, routes: [{ name: 'inbox' }] },
        sources: {},
      })
    )

    hydrateWarmInitialLoad({ routes })
    expect(isWarmRoutePreloadPending()).toBe(false)

    // 3. waitForWarmRoutePreload times out safely without hanging
    const start = Date.now()
    await waitForWarmRoutePreload(20)
    expect(Date.now() - start).toBeLessThan(100)
  })
})
