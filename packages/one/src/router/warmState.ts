import { SERVER_CONTEXT_KEY } from '../constants'
import { extractPathFromURL } from '../fork/extractPathFromURL'
import { getPathDataFromState } from '../fork/getPathFromState'
import type { OneRouter } from '../interfaces/router'
import { Storage } from '../platform/storage'
import type { One } from '../vite/types'
import type { OneLinkingOptions } from './getLinkingConfig'
import type { RouteNode } from './Route'
import { preloadRouteModules } from './useViteRoutes'
import { createWarmSerializer } from './warmStateSerialize'
import {
  DEFAULT_WARM_STATE_MAX_AGE_MS,
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
export function hydrateWarmInitialLoad(options?: {
  routes?: Record<string, () => Promise<unknown>>
  flags?: One.Flags
}): WarmStateEnvelope | null {
  if (isSSRRuntime()) return null
  if (options?.flags) {
    configureWarmStateFromFlags(options.flags)
  }
  if (!config.enabled) return null

  const envelope = ensureLoadedEnvelope()
  if (!envelope) return null

  for (const [key, source] of registeredSources) {
    hydrateSourceKey(key, source, envelope)
  }

  if (config.preloadRoutes && envelope.pathname && options?.routes) {
    globalThis['__importMetaGlobbed'] ??= options.routes
    void preloadRouteModules(envelope.pathname).catch(() => {})
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
  if (isSSRRuntime() || warmInitialRouteConsumed || !shouldRestoreWarmRoute()) {
    return undefined
  }
  warmInitialRouteConsumed = true

  const envelope = hydrateWarmInitialLoad()
  if (!envelope?.state || !routeNode) return undefined

  if (!routesMatchLinkingConfig(envelope.state.routes, linking?.config?.screens)) {
    safeRemoveStorage(WARM_STATE_STORAGE_KEY)
    hydratedEnvelope = null
    return undefined
  }

  try {
    getPathDataFromState(envelope.state as any, {
      screens: [],
      ...linking?.config,
    })
  } catch {
    safeRemoveStorage(WARM_STATE_STORAGE_KEY)
    hydratedEnvelope = null
    return undefined
  }

  warmRouteApplied = true
  return envelope.state as unknown as OneRouter.ResultState
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
  if (!options?.keepConfig) {
    config = { ...defaultConfig }
    registeredSources.clear()
  }
}

/**
 * reconcile a cold native launch url after mounting synchronously from warm state.
 * normal springboard launches resolve null and leave the warm screen untouched.
 */
export async function reconcileNativeColdDeepLink(options: {
  getInitialURL: () => Promise<string | null>
  prefixes?: string[]
  currentPathname?: string
  navigateTo: (href: string) => void
}): Promise<string | null> {
  if (isSSRRuntime()) return null
  let initialUrl: string | null = null
  try {
    initialUrl = await options.getInitialURL()
  } catch {
    return null
  }
  if (!initialUrl) return null

  const extracted = extractPathFromURL(options.prefixes ?? [], initialUrl)
  if (!extracted) return null

  const normalizedTarget = extracted.startsWith('/') ? extracted : `/${extracted}`
  const targetPathname = normalizedTarget.split('?')[0].split('#')[0] || '/'
  if (options.currentPathname && targetPathname === options.currentPathname) {
    return null
  }

  options.navigateTo(normalizedTarget)
  return normalizedTarget
}
