import { SERVER_CONTEXT_KEY } from '../constants'
import { extractPathFromURL } from '../fork/extractPathFromURL'
import { getPathDataFromState } from '../fork/getPathFromState'
import { getStateFromPath } from '../fork/getStateFromPath'
import type { OneRouter } from '../interfaces/router'
import { Storage } from '../platform/storage'
import type { One } from '../vite/types'
import type { OneLinkingOptions } from './getLinkingConfig'
import type { RouteNode } from './Route'
import { preloadRouteModules } from './useViteRoutes'
import { createWarmSerializer } from './warmStateSerialize'
import {
  DEFAULT_WARM_STATE_MAX_AGE_MS,
  matchRoutePattern,
  normalizeRoutePattern,
  parseWarmEnvelope,
  serializeWarmInputSync,
  WARM_STATE_STORAGE_KEY,
  type WarmNavigationSnapshot,
  type WarmRouteSnapshot,
  type WarmStartOptions,
  type WarmStateEnvelope,
  type WarmStateSerializeInput,
  type WarmStateStorage,
} from './warmStateShared'

export {
  matchRoutePattern,
  normalizeRoutePattern,
} from './warmStateShared'

export type {
  WarmNavigationSnapshot,
  WarmRouteSnapshot,
  WarmStartOptions,
  WarmStateEnvelope,
  WarmStateStorage,
} from './warmStateShared'

export type WarmStateSource<T = unknown> = {
  getSnapshot: () => T
  hydrate: (value: T) => void
  validate?: (value: unknown) => value is T
}

type WarmConfig = {
  enabled: boolean
  schemaVersion: number
  maxAgeMs: number
  restoreRoute: boolean
  restoreWebRoute: boolean
  preloadRoutes: boolean
  includeRoutes?: string[]
  excludeRoutes?: string[]
  alignRoute?: (saved: {
    pathname: string
    state: WarmNavigationSnapshot
  }) => boolean | string | WarmNavigationSnapshot | null | undefined
  storage?: WarmStateStorage
  now: () => number
}

const defaultConfig: WarmConfig = {
  enabled: false,
  schemaVersion: 1,
  maxAgeMs: DEFAULT_WARM_STATE_MAX_AGE_MS,
  restoreRoute: true,
  restoreWebRoute: false,
  preloadRoutes: true,
  includeRoutes: undefined,
  excludeRoutes: undefined,
  alignRoute: undefined,
  now: () => Date.now(),
}

let config: WarmConfig = { ...defaultConfig }
const registeredSources = new Map<string, WarmStateSource<any>>()
const hydratedSourceKeys = new Set<string>()

let loadedFromStorage = false
let hydratedEnvelope: WarmStateEnvelope | null = null
let warmRouteApplied = false
let warmInitialRouteConsumed = false

let latestNavState: unknown
let latestPathname: string | undefined
let pendingInput: WarmStateSerializeInput | null = null
let serializer: ReturnType<typeof createWarmSerializer> | null = null

function isNativeRuntime(): boolean {
  return process.env.TAMAGUI_TARGET === 'native'
}

function isWebClientRuntime(): boolean {
  return process.env.TAMAGUI_TARGET !== 'native' && typeof window !== 'undefined'
}

function isSSRRuntime(): boolean {
  return process.env.TAMAGUI_TARGET !== 'native' && typeof window === 'undefined'
}

function hasDefaultStorage(): boolean {
  if (isSSRRuntime()) return false
  if (isNativeRuntime()) return true
  return typeof localStorage !== 'undefined'
}

function getStorage(): WarmStateStorage | null {
  if (config.storage) return config.storage
  if (!hasDefaultStorage()) return null
  return Storage
}

function safeReadStorage(key: string): string | null {
  const storage = getStorage()
  if (!storage) return null
  try {
    return storage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteStorage(key: string, value: string): boolean {
  const storage = getStorage()
  if (!storage) return false
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function safeRemoveStorage(key: string): void {
  const storage = getStorage()
  if (!storage) return
  try {
    storage.removeItem(key)
  } catch {
    // storage cleanup failure must not break boot or navigation
  }
}

function normalizeWarmFlag(flag: boolean | WarmStartOptions | undefined): WarmStartOptions | null {
  if (!flag) return null
  if (flag === true) return { enabled: true }
  return { enabled: flag.enabled ?? true, ...flag }
}

/** configure warm boot behavior and optional storage/clock adapters. */
export function configureWarmState(
  options: WarmStartOptions & { storage?: WarmStateStorage; now?: () => number }
): void {
  if (isSSRRuntime()) return
  config = {
    ...config,
    ...(options.enabled !== undefined ? { enabled: options.enabled } : {}),
    ...(options.schemaVersion !== undefined ? { schemaVersion: options.schemaVersion } : {}),
    ...(options.maxAgeMs !== undefined ? { maxAgeMs: options.maxAgeMs } : {}),
    ...(options.restoreRoute !== undefined ? { restoreRoute: options.restoreRoute } : {}),
    ...(options.restoreWebRoute !== undefined
      ? { restoreWebRoute: options.restoreWebRoute }
      : {}),
    ...(options.preloadRoutes !== undefined ? { preloadRoutes: options.preloadRoutes } : {}),
    ...(options.includeRoutes !== undefined ? { includeRoutes: options.includeRoutes } : {}),
    ...(options.excludeRoutes !== undefined ? { excludeRoutes: options.excludeRoutes } : {}),
    ...(options.alignRoute !== undefined ? { alignRoute: options.alignRoute } : {}),
    ...(options.storage !== undefined ? { storage: options.storage } : {}),
    ...(options.now !== undefined ? { now: options.now } : {}),
  }
}

/** apply createApp flags.warmStart on client and native runtimes. */
export function configureWarmStateFromFlags(flags?: One.Flags): void {
  if (isSSRRuntime() || !flags?.warmStart) return
  const normalized = normalizeWarmFlag(flags.warmStart)
  if (normalized) {
    configureWarmState(normalized)
  }
}

export function isWarmStateEnabled(): boolean {
  return !isSSRRuntime() && config.enabled
}

export function shouldRestoreWarmRoute(): boolean {
  if (!isWarmStateEnabled()) return false
  if (isNativeRuntime()) return config.restoreRoute
  return config.restoreWebRoute
}

function hydrateSourceKey(
  key: string,
  source: WarmStateSource<any>,
  envelope: WarmStateEnvelope
): void {
  if (hydratedSourceKeys.has(key)) return
  if (!(key in envelope.sources)) return
  const payload = envelope.sources[key]
  if (source.validate && !source.validate(payload)) return
  hydratedSourceKeys.add(key)
  source.hydrate(payload)
}

/**
 * register a named client state slice to persist on a background thread and
 * hydrate synchronously on warm launch before first render.
 */
export function registerWarmStateSource<T>(
  key: string,
  source: WarmStateSource<T>
): () => void {
  registeredSources.set(key, source)
  if (!isSSRRuntime() && config.enabled && hydratedEnvelope) {
    hydrateSourceKey(key, source, hydratedEnvelope)
  }
  return () => {
    registeredSources.delete(key)
  }
}

function ensureLoadedEnvelope(): WarmStateEnvelope | null {
  if (!isWarmStateEnabled()) return null
  if (loadedFromStorage) return hydratedEnvelope
  loadedFromStorage = true

  const raw = safeReadStorage(WARM_STATE_STORAGE_KEY)
  if (!raw) return null

  const parsed = parseWarmEnvelope(raw, {
    schemaVersion: config.schemaVersion,
    maxAgeMs: config.maxAgeMs,
    now: config.now(),
  })

  if (!parsed) {
    safeRemoveStorage(WARM_STATE_STORAGE_KEY)
    hydratedEnvelope = null
    return null
  }

  hydratedEnvelope = parsed
  return hydratedEnvelope
}

export function getHydratedWarmState(): WarmStateEnvelope | null {
  if (!isWarmStateEnabled()) return null
  return ensureLoadedEnvelope()
}

/**
 * synchronously read and validate cached warm state, hydrate registered state
 * slices before first render, and warm up saved route modules in parallel.
 */
function getPathnameFromSnapshot(snapshot: WarmNavigationSnapshot): string | undefined {
  const activeRoute = snapshot.routes[snapshot.index ?? 0] ?? snapshot.routes[0]
  if (!activeRoute) return undefined
  if (typeof activeRoute.path === 'string' && activeRoute.path) {
    return activeRoute.path.startsWith('/') ? activeRoute.path : `/${activeRoute.path}`
  }
  if (typeof activeRoute.name === 'string' && activeRoute.name) {
    return activeRoute.name === 'index' ? '/' : `/${activeRoute.name}`
  }
  return undefined
}

let cachedAlignedRoute: {
  evaluated: true
  result: boolean | string | WarmNavigationSnapshot | null | undefined
} | null = null

function getOrEvaluateAlignRoute(
  envelope: WarmStateEnvelope
): boolean | string | WarmNavigationSnapshot | null | undefined {
  if (!config.alignRoute || !envelope.state) {
    return undefined
  }
  if (cachedAlignedRoute && cachedAlignedRoute.evaluated) {
    return cachedAlignedRoute.result
  }
  const result = config.alignRoute({
    pathname: envelope.pathname ?? '/',
    state: envelope.state,
  })
  cachedAlignedRoute = { evaluated: true, result }
  return result
}

let activeWarmRoutePreload: Promise<unknown> | null = null
let warmRoutePreloadCompleted = false

export function isWarmRoutePreloadPending(): boolean {
  return activeWarmRoutePreload !== null && !warmRoutePreloadCompleted
}

export async function waitForWarmRoutePreload(timeoutMs = 200): Promise<void> {
  if (!activeWarmRoutePreload || warmRoutePreloadCompleted) return
  try {
    if (timeoutMs <= 0) {
      await activeWarmRoutePreload
      return
    }
    await Promise.race([
      activeWarmRoutePreload,
      new Promise((resolve) => setTimeout(resolve, timeoutMs)),
    ])
  } catch {
    // preload failure should not block rendering
  }
}

export function hydrateWarmInitialLoad(options?: {
  routes?: Record<string, () => Promise<unknown>>
  flags?: One.Flags
}): WarmStateEnvelope | null {
  if (isSSRRuntime()) return null
  if (options?.flags) {
    configureWarmStateFromFlags(options.flags)
  }
  if (typeof globalThis !== 'undefined' && (globalThis as any).__oneWarmStartOptions) {
    configureWarmState((globalThis as any).__oneWarmStartOptions)
  }
  if (!config.enabled) return null

  const envelope = ensureLoadedEnvelope()
  if (!envelope) return null

  for (const [key, source] of registeredSources) {
    hydrateSourceKey(key, source, envelope)
  }

  if (config.preloadRoutes && envelope.pathname && options?.routes) {
    let targetPathname: string | undefined = envelope.pathname
    const cleanPath = targetPathname.split('?')[0].split('#')[0] || '/'

    if (config.excludeRoutes?.some((p) => matchRoutePattern(p, cleanPath))) {
      targetPathname = undefined
    } else if (
      config.includeRoutes &&
      config.includeRoutes.length > 0 &&
      !config.includeRoutes.some((p) => matchRoutePattern(p, cleanPath))
    ) {
      targetPathname = undefined
    } else if (config.alignRoute && envelope.state) {
      const aligned = getOrEvaluateAlignRoute(envelope)
      if (aligned === false || aligned === null) {
        targetPathname = undefined
      } else if (typeof aligned === 'string') {
        targetPathname = aligned
      } else if (typeof aligned === 'object' && aligned !== null) {
        targetPathname = getPathnameFromSnapshot(aligned)
      }
    }

    if (targetPathname) {
      globalThis['__importMetaGlobbed'] = options.routes
      warmRoutePreloadCompleted = false
      const promise = preloadRouteModules(targetPathname)
        .catch(() => {})
        .finally(() => {
          warmRoutePreloadCompleted = true
        })
      activeWarmRoutePreload = promise
    }
  }

  return envelope
}

function routesMatchLinkingConfig(
  routes: WarmRouteSnapshot[],
  screens: Record<string, any> | undefined
): boolean {
  if (!screens || Object.keys(screens).length === 0) return true
  for (let i = 0; i < routes.length; i++) {
    const route = routes[i]
    const entry = screens[route.name]
    if (entry === undefined || entry === null) return false
    if (route.state) {
      if (typeof entry !== 'object' || !entry.screens) return false
      if (!routesMatchLinkingConfig(route.state.routes, entry.screens)) return false
    }
  }
  return true
}

/** consume validated initial navigation state for instant first-frame mount. */
export function consumeWarmInitialNavigationState(
  routeNode: RouteNode | null,
  linking?: OneLinkingOptions
): OneRouter.ResultState | undefined {
  if (isSSRRuntime()) return undefined
  if (typeof globalThis !== 'undefined' && (globalThis as any).__oneWarmStartOptions) {
    configureWarmState((globalThis as any).__oneWarmStartOptions)
  }
  if (warmInitialRouteConsumed || !shouldRestoreWarmRoute()) {
    return undefined
  }
  warmInitialRouteConsumed = true

  const envelope = hydrateWarmInitialLoad()
  if (!envelope?.state || !routeNode) return undefined

  const savedPathname = (envelope.pathname || '/').split('?')[0].split('#')[0] || '/'

  // excludeRoutes takes precedence over includeRoutes
  if (config.excludeRoutes && config.excludeRoutes.length > 0) {
    if (config.excludeRoutes.some((pattern) => matchRoutePattern(pattern, savedPathname))) {
      return undefined
    }
  }

  // includeRoutes: when provided and non-empty, must match at least one
  if (config.includeRoutes && config.includeRoutes.length > 0) {
    if (!config.includeRoutes.some((pattern) => matchRoutePattern(pattern, savedPathname))) {
      return undefined
    }
  }

  let targetState: WarmNavigationSnapshot = envelope.state

  if (config.alignRoute) {
    const aligned = getOrEvaluateAlignRoute(envelope)

    if (aligned === false || aligned === null) {
      return undefined
    }

    if (typeof aligned === 'string') {
      const getParsedState = linking?.getStateFromPath ?? getStateFromPath
      const parsed = getParsedState(aligned, linking?.config)
      if (!parsed || !parsed.routes || parsed.routes.length === 0) {
        return undefined
      }
      targetState = parsed as WarmNavigationSnapshot
      envelope.pathname = aligned
    } else if (typeof aligned === 'object' && aligned !== null) {
      if (!aligned.routes || !Array.isArray(aligned.routes) || aligned.routes.length === 0) {
        return undefined
      }
      targetState = aligned
      const derivedPath = getPathnameFromSnapshot(aligned)
      if (derivedPath) {
        envelope.pathname = derivedPath
      }
    }
  }

  if (!routesMatchLinkingConfig(targetState.routes, linking?.config?.screens)) {
    if (targetState === envelope.state) {
      safeRemoveStorage(WARM_STATE_STORAGE_KEY)
      hydratedEnvelope = null
    }
    return undefined
  }

  try {
    getPathDataFromState(targetState as any, {
      screens: [],
      ...linking?.config,
    })
  } catch {
    if (targetState === envelope.state) {
      safeRemoveStorage(WARM_STATE_STORAGE_KEY)
      hydratedEnvelope = null
    }
    return undefined
  }

  warmRouteApplied = true
  return targetState as unknown as OneRouter.ResultState
}

/** check whether web SPA root is eligible to mount directly into saved warm route. */
/** check dynamically whether runtime and initial url allow warm route restoration. */
export function shouldAttemptWarmRouteRestore(initialLocation?: URL): boolean {
  if (!shouldRestoreWarmRoute()) return false
  return isNativeRuntime() || isWarmWebRestoreEligible(initialLocation)
}

export function isWarmWebRestoreEligible(initialLocation?: URL): boolean {
  if (!isWebClientRuntime() || !config.restoreWebRoute || !initialLocation) return false
  const serverMode = globalThis[SERVER_CONTEXT_KEY]?.mode
  if (serverMode !== 'spa' && serverMode !== 'spa-shell') return false
  return initialLocation.pathname === '/' && !initialLocation.search && !initialLocation.hash
}

export function isWarmRouteApplied(): boolean {
  return warmRouteApplied
}

export function consumeWarmRouteApplied(): boolean {
  if (!warmRouteApplied) return false
  warmRouteApplied = false
  return true
}

function ensureSerializer() {
  if (serializer) return serializer
  serializer = createWarmSerializer((state) => {
    if (state.phase !== 'ready') return
    if (!pendingInput) return
    if (safeWriteStorage(WARM_STATE_STORAGE_KEY, state.result.value.json)) {
      pendingInput = null
    }
  })
  return serializer
}

function collectSources(): Record<string, unknown> {
  const sources: Record<string, unknown> = {}
  for (const [key, source] of registeredSources) {
    sources[key] = source.getSnapshot()
  }
  return sources
}

/** schedule off-thread serialization and storage persistence of latest route + sources. */
export function scheduleWarmStatePersist(navState?: unknown, pathname?: string): void {
  if (!isWarmStateEnabled()) return
  if (navState !== undefined) {
    latestNavState = navState
  }
  if (pathname !== undefined) {
    latestPathname = pathname
  }

  const input: WarmStateSerializeInput = {
    schemaVersion: config.schemaVersion,
    updatedAt: config.now(),
    pathname: latestPathname,
    state: latestNavState,
    sources: collectSources(),
  }
  pendingInput = input
  ensureSerializer().update(input)
}

/** synchronously persist any queued warm state before backgrounding or termination. */
export function flushWarmState(): boolean {
  if (!isWarmStateEnabled() || !pendingInput) return false
  const input = pendingInput
  pendingInput = null
  const { json } = serializeWarmInputSync(input)
  return safeWriteStorage(WARM_STATE_STORAGE_KEY, json)
}

/** clear persisted warm snapshot and reset cached boot state. */
export function clearWarmState(options?: { keepConfig?: boolean }): void {
  safeRemoveStorage(WARM_STATE_STORAGE_KEY)
  loadedFromStorage = false
  hydratedEnvelope = null
  hydratedSourceKeys.clear()
  warmRouteApplied = false
  warmInitialRouteConsumed = false
  latestNavState = undefined
  latestPathname = undefined
  pendingInput = null
  serializer?.dispose()
  serializer = null
  activeWarmRoutePreload = null
  warmRoutePreloadCompleted = false
  cachedAlignedRoute = null
  delete globalThis['__importMetaGlobbed']
  if (!options?.keepConfig) {
    config = { ...defaultConfig }
    registeredSources.clear()
  }
}

export function normalizeHref(href: string): string {
  const withLeading = href.startsWith('/') ? href : `/${href}`
  const [withoutHash, ...hashParts] = withLeading.split('#')
  const hash = hashParts.length > 0 ? `#${hashParts.join('#')}` : ''
  const [pathname, ...queryParts] = withoutHash.split('?')
  const query = queryParts.length > 0 ? `?${queryParts.join('?')}` : ''
  const cleanPathname =
    pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
  return `${cleanPathname}${query}${hash}`
}

/**
 * reconcile a cold native launch url after mounting synchronously from warm state.
 * normal springboard launches resolve null and leave the warm screen untouched.
 */
export async function reconcileNativeColdDeepLink(options: {
  getInitialURL: () => Promise<string | null>
  prefixes?: string[]
  currentHref?: string
  currentPathname?: string
  navigateTo: (href: string) => void
  onComplete?: (target: string | null) => void
}): Promise<string | null> {
  if (isSSRRuntime()) return null
  let initialUrl: string | null = null
  try {
    initialUrl = await options.getInitialURL()
  } catch {
    options.onComplete?.(null)
    return null
  }
  if (!initialUrl) {
    options.onComplete?.(null)
    return null
  }

  const extracted = extractPathFromURL(options.prefixes ?? [], initialUrl)
  if (!extracted) {
    options.onComplete?.(null)
    return null
  }

  const normalizedTarget = normalizeHref(extracted)
  const current = options.currentHref ?? options.currentPathname
  const normalizedCurrent = current ? normalizeHref(current) : undefined

  if (normalizedCurrent && normalizedTarget === normalizedCurrent) {
    options.onComplete?.(null)
    return null
  }

  options.navigateTo(normalizedTarget)
  options.onComplete?.(normalizedTarget)
  return normalizedTarget
}
