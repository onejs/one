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
  reconcileNativeColdDeepLink,
  registerWarmStateSource,
  scheduleWarmStatePersist,
  type WarmStateStorage,
} from './warmState'
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
    './settings.tsx': { default: () => null },
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

  it('reconciles cold native deep links only when launch url resolves to a different path', async () => {
    const navigateTo = vi.fn()

    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => null,
        prefixes: ['myapp://'],
        currentPathname: '/inbox',
        navigateTo,
      })
    ).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()

    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => 'myapp://inbox',
        prefixes: ['myapp://'],
        currentPathname: '/inbox',
        navigateTo,
      })
    ).toBeNull()
    expect(navigateTo).not.toHaveBeenCalled()

    expect(
      await reconcileNativeColdDeepLink({
        getInitialURL: async () => 'myapp://settings?tab=audio',
        prefixes: ['myapp://'],
        currentPathname: '/inbox',
        navigateTo,
      })
    ).toBe('/settings?tab=audio')
    expect(navigateTo).toHaveBeenCalledWith('/settings?tab=audio')
  })
})
