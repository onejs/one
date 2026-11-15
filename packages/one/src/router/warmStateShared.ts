export const WARM_STATE_VERSION = 1
export const DEFAULT_WARM_STATE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const WARM_STATE_STORAGE_KEY = '__one_warm_state_v1__'

export type WarmRouteSnapshot = {
  name: string
  params?: Record<string, unknown>
  path?: string
  state?: WarmNavigationSnapshot
}

export type WarmNavigationSnapshot = {
  index?: number
  type?: string
  routes: WarmRouteSnapshot[]
}

export type WarmStateEnvelope = {
  v: typeof WARM_STATE_VERSION
  schemaVersion: number
  updatedAt: number
  pathname?: string
  state?: WarmNavigationSnapshot
  sources: Record<string, unknown>
}

export type WarmStartOptions = {
  enabled?: boolean
  schemaVersion?: number
  maxAgeMs?: number
  /** restore saved navigation state on native launches (default true when enabled) */
  restoreRoute?: boolean
  /** restore saved route on web SPA root launches when url is "/" (default false) */
  restoreWebRoute?: boolean
  /** preload saved route modules during boot (default true when enabled) */
  preloadRoutes?: boolean
  /** glob/prefix/pathname patterns allowed to restore saved route (e.g. ['/inbox', '/feed/*']) */
  includeRoutes?: string[]
  /** glob/prefix/pathname patterns that never restore saved route (e.g. ['/auth/*', '/modal/*']) */
  excludeRoutes?: string[]
  /** custom route alignment / fallback hook returning boolean, fallback path string, or custom snapshot */
  alignRoute?: (saved: {
    pathname: string
    state: WarmNavigationSnapshot
  }) => boolean | string | WarmNavigationSnapshot | null | undefined
}

export type WarmStateStorage = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
  removeItem: (key: string) => void
}

export type WarmStateSerializeInput = {
  schemaVersion: number
  updatedAt: number
  pathname?: string
  state?: unknown
  sources: Record<string, unknown>
}

export type WarmStateSerializeOutput = {
  json: string
  updatedAt: number
}

const MAX_WARM_DEPTH = 32

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  'worklet'
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }
  const proto = Object.getPrototypeOf(value)
  return proto === Object.prototype || proto === null
}

/** prune functions, symbols, non-finite numbers and deep cycles to json-safe data. */
export function sanitizeWarmValue(value: unknown, depth = 0): unknown {
  'worklet'
  if (depth > MAX_WARM_DEPTH) return undefined
  if (value === null) return null
  const kind = typeof value
  if (kind === 'string' || kind === 'boolean') return value
  if (kind === 'number') return Number.isFinite(value) ? value : undefined
  if (kind !== 'object') return undefined

  if (Array.isArray(value)) {
    const out: unknown[] = []
    for (let i = 0; i < value.length; i++) {
      const next = sanitizeWarmValue(value[i], depth + 1)
      out.push(next === undefined ? null : next)
    }
    return out
  }

  if (value instanceof Date) {
    return Number.isFinite(value.getTime()) ? value.toISOString() : undefined
  }

  const out: Record<string, unknown> = {}
  const keys = Object.keys(value as Record<string, unknown>)
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i]
    const next = sanitizeWarmValue((value as Record<string, unknown>)[key], depth + 1)
    if (next !== undefined) {
      out[key] = next
    }
  }
  return out
}

/** strip transient navigation runtime keys so react navigation rehydrates cleanly. */
export function toPartialNavigationState(
  state: unknown,
  depth = 0
): WarmNavigationSnapshot | undefined {
  'worklet'
  if (depth > MAX_WARM_DEPTH || !state || typeof state !== 'object') {
    return undefined
  }
  const candidate = state as {
    index?: unknown
    type?: unknown
    routes?: unknown
  }
  if (!Array.isArray(candidate.routes) || candidate.routes.length === 0) {
    return undefined
  }

  const routes: WarmRouteSnapshot[] = []
  for (let i = 0; i < candidate.routes.length; i++) {
    const route = candidate.routes[i] as {
      name?: unknown
      params?: unknown
      path?: unknown
      state?: unknown
    } | null
    if (!route || typeof route !== 'object' || typeof route.name !== 'string' || !route.name) {
      return undefined
    }
    const nextRoute: WarmRouteSnapshot = { name: route.name }
    if (route.params && typeof route.params === 'object') {
      const cleanParams = sanitizeWarmValue(route.params, depth + 1)
      if (cleanParams && typeof cleanParams === 'object' && !Array.isArray(cleanParams)) {
        nextRoute.params = cleanParams as Record<string, unknown>
      }
    }
    if (typeof route.path === 'string') {
      nextRoute.path = route.path
    }
    if (route.state !== undefined) {
      const nested = toPartialNavigationState(route.state, depth + 1)
      if (nested) {
        nextRoute.state = nested
      }
    }
    routes.push(nextRoute)
  }

  const partial: WarmNavigationSnapshot = { routes }
  if (
    typeof candidate.index === 'number' &&
    Number.isInteger(candidate.index) &&
    candidate.index >= 0 &&
    candidate.index < routes.length
  ) {
    partial.index = candidate.index
  }
  if (typeof candidate.type === 'string' && candidate.type) {
    partial.type = candidate.type
  }
  return partial
}

/** sanitize and serialize a warm snapshot envelope into compact json. */
export function serializeWarmInputSync(
  input: WarmStateSerializeInput
): WarmStateSerializeOutput {
  'worklet'
  const cleanSources = sanitizeWarmValue(input.sources)
  const envelope: WarmStateEnvelope = {
    v: WARM_STATE_VERSION,
    schemaVersion: input.schemaVersion,
    updatedAt: input.updatedAt,
    sources:
      cleanSources && typeof cleanSources === 'object' && !Array.isArray(cleanSources)
        ? (cleanSources as Record<string, unknown>)
        : {},
  }
  if (typeof input.pathname === 'string' && input.pathname) {
    envelope.pathname = input.pathname
  }
  const cleanState = toPartialNavigationState(input.state)
  if (cleanState) {
    envelope.state = cleanState
  }
  return {
    json: JSON.stringify(envelope),
    updatedAt: input.updatedAt,
  }
}

/** validate raw persisted json once at the storage read boundary. */
export function parseWarmEnvelope(
  raw: string | null | undefined,
  options: { schemaVersion: number; maxAgeMs: number; now: number }
): WarmStateEnvelope | null {
  if (!raw || typeof raw !== 'string') return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (!isPlainRecord(parsed)) return null
  if (parsed.v !== WARM_STATE_VERSION) return null
  if (parsed.schemaVersion !== options.schemaVersion) return null
  if (typeof parsed.updatedAt !== 'number' || !Number.isFinite(parsed.updatedAt)) {
    return null
  }
  if (options.maxAgeMs >= 0 && options.now - parsed.updatedAt > options.maxAgeMs) {
    return null
  }
  if (!isPlainRecord(parsed.sources)) return null

  const state =
    parsed.state === undefined ? undefined : toPartialNavigationState(parsed.state)
  if (parsed.state !== undefined && !state) {
    return null
  }

  return {
    v: WARM_STATE_VERSION,
    schemaVersion: parsed.schemaVersion,
    updatedAt: parsed.updatedAt,
    pathname: typeof parsed.pathname === 'string' ? parsed.pathname : undefined,
    state,
    sources: parsed.sources,
  }
}


/** normalize a path or pattern by stripping query/hash and standardizing leading/trailing slashes. */
export function normalizeRoutePattern(pattern: string): string {
  'worklet'
  const stripped = pattern.split('?')[0].split('#')[0] || '/'
  const withLeading = stripped.startsWith('/') ? stripped : `/${stripped}`
  if (withLeading.length > 1 && withLeading.endsWith('/')) {
    return withLeading.slice(0, -1)
  }
  return withLeading
}

/**
 * test whether a candidate pathname matches a glob/prefix/pathname pattern.
 * e.g. '/inbox' matches '/inbox', '/feed/*' matches '/feed/123' and '/feed',
 * '/modal/**' matches '/modal/sheet'. Query and hash are ignored.
 */
export function matchRoutePattern(pattern: string, pathname: string): boolean {
  'worklet'
  const rawPath = pathname.split('?')[0].split('#')[0] || '/'
  const normPath = normalizeRoutePattern(rawPath)
  const normPattern = normalizeRoutePattern(pattern)

  if (normPattern === '*' || normPattern === '/*') return true
  if (normPattern === normPath) return true

  // prefix wildcard e.g. /feed/* or /feed/**
  if (pattern.endsWith('/*') || pattern.endsWith('/**')) {
    const base = normalizeRoutePattern(pattern.replace(/\/\*+$/, ''))
    return normPath === base || normPath.startsWith(base + '/')
  }

  // glob wildcard matching e.g. /users/*/profile
  if (pattern.includes('*')) {
    const regexStr =
      '^' +
      normPattern
        .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '.*') +
      '$'
    return new RegExp(regexStr).test(normPath)
  }

  return false
}
