import { stripBaseUrl } from '../fork/getStateFromPath-mods'

function stripPathSuffix(path: string): string {
  const queryIndex = path.indexOf('?')
  const hashIndex = path.indexOf('#')
  let end = path.length

  if (queryIndex >= 0) end = Math.min(end, queryIndex)
  if (hashIndex >= 0) end = Math.min(end, hashIndex)

  return path.slice(0, end)
}

export function stripTrailingSlash(pathname: string): string {
  return pathname.length > 1 && pathname.endsWith('/') ? pathname.slice(0, -1) : pathname
}

export function normalizeRoutePathname(pathname: string): string {
  return stripTrailingSlash(stripBaseUrl(stripPathSuffix(pathname)))
}

// react navigation serializes missing dynamic params as literal path segments.
export function hasLostDynamicSegment(path: string): boolean {
  return stripPathSuffix(path).split('/').includes('undefined')
}

// rn runtimes (expo/hermes) can polyfill `document` while leaving
// `window.location` undefined, so `typeof document` is not a safe web check.
// the only reliable signal is an actual string pathname on window.location.
export function getSafeWindowPathname(): string | undefined {
  if (
    typeof window === 'undefined' ||
    !window.location ||
    typeof window.location.pathname !== 'string'
  ) {
    return undefined
  }
  return window.location.pathname
}

export function getSafeWindowPath(): string | undefined {
  const pathname = getSafeWindowPathname()
  if (pathname === undefined) return undefined
  return pathname + (window.location.search || '')
}

export function getPathWithRecoveredDynamicSegment(
  paths: readonly (string | undefined)[],
  fallbackPath = getSafeWindowPath()
): string | undefined {
  // when navigator state loses a dynamic segment, the browser url remains the
  // source of truth.
  for (const path of paths) {
    if (path !== undefined && !hasLostDynamicSegment(path)) {
      return path
    }
  }

  return fallbackPath
}

export function getPathnameWithRecoveredDynamicSegment(
  pathname: string,
  fallbackPath = getSafeWindowPath()
): string {
  return normalizeRoutePathname(
    getPathWithRecoveredDynamicSegment([pathname], fallbackPath) ?? pathname
  )
}
