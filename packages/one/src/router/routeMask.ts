/**
 * Configuration for a route mask.
 * Route masking displays a different URL in the browser than the actual route being rendered.
 * Uses history.state to store the actual route, so on page reload the router can restore the original route.
 */
export interface RouteMaskOptions {
  /**
   * The route pattern to match (the actual route being navigated to).
   * Supports dynamic segments like [id] or $id.
   *
   * @example '/photos/[id]/modal' or '/photos/$photoId/modal'
   */
  from: string

  /**
   * The route pattern to display in the browser URL (the masked URL).
   * Supports dynamic segments that will be populated from the matched params.
   *
   * @example '/photos/[id]' or '/photos/$photoId'
   */
  to: string

  /**
   * How to handle parameters when masking.
   * - `true` (default): Forward all matched params to the masked URL
   * - `false`: Don't forward any params
   * - Function: Custom param transformation
   *
   * @default true
   */
  params?: boolean | ((matchedParams: Record<string, string>) => Record<string, string>)

  /**
   * If true, unmask when the page is reloaded (show the masked URL's content).
   * If false (default), keep the actual route on reload (show the original content).
   *
   * When false: Reload at /photos/5 → still shows /photos/5/modal content
   * When true: Reload at /photos/5 → shows /photos/5 content
   *
   * @default false
   */
  unmaskOnReload?: boolean

  /**
   * If true, encode the actual route as a base64 postfix in the URL pathname instead of history.state.
   *
   * URL will look like: /photos/5__L3Bob3Rvcy81L21vZGFs
   *
   * Benefits:
   * - Server can parse the postfix and render the actual route (no SSR flash)
   * - URL contains the "truth" about what to render
   * - Works consistently across SSR, SSG, and SPA
   * - No query parameter visible
   *
   * Tradeoffs:
   * - URL has a base64 suffix visible after `__`
   *
   * @default false
   */
  useSearchParam?: boolean
}

/**
 * A compiled route mask ready for matching.
 */
export interface RouteMask extends RouteMaskOptions {
  /** Regex pattern for matching the 'from' route */
  _fromRegex: RegExp
  /** Parameter names extracted from the 'from' pattern */
  _fromParams: string[]
}

/**
 * Creates a route mask for automatic URL masking during navigation.
 *
 * Route masking displays a different URL in the browser than the actual route.
 * Uses browser history.state to store the actual route, enabling:
 * - Modal overlays with clean shareable URLs
 * - Different URL for in-app navigation vs direct access
 *
 * @example
 * ```tsx
 * import { createRouteMask } from 'one'
 *
 * const photoMask = createRouteMask({
 *   from: '/photos/[id]/modal',
 *   to: '/photos/[id]',
 *   params: true,
 * })
 *
 * // In vite.config.ts:
 * one({
 *   router: { routeMasks: [photoMask] },
 * })
 * ```
 */
export function createRouteMask(options: RouteMaskOptions): RouteMask {
  const {
    from,
    to,
    params = true,
    unmaskOnReload = false,
    useSearchParam = false,
  } = options

  // Extract parameter names and build regex from the 'from' pattern
  const fromParams: string[] = []
  const fromRegexStr = from
    .split('/')
    .map((segment) => {
      // Handle catch-all segments [...rest] or $...rest
      if (segment.startsWith('[...') && segment.endsWith(']')) {
        const paramName = segment.slice(4, -1)
        fromParams.push(paramName)
        return '(.+)'
      }
      if (segment.startsWith('$...')) {
        const paramName = segment.slice(4)
        fromParams.push(paramName)
        return '(.+)'
      }
      // Handle dynamic segments [id] or $id
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const paramName = segment.slice(1, -1)
        fromParams.push(paramName)
        return '([^/]+)'
      }
      if (segment.startsWith('$')) {
        const paramName = segment.slice(1)
        fromParams.push(paramName)
        return '([^/]+)'
      }
      // Static segment - escape regex special chars
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    })
    .join('/')

  return {
    from,
    to,
    params,
    unmaskOnReload,
    useSearchParam,
    _fromRegex: new RegExp(`^${fromRegexStr}$`),
    _fromParams: fromParams,
  }
}

/**
 * Matches a pathname against a route mask.
 * Returns the matched params if successful, or null if no match.
 */
export function matchRouteMask(
  pathname: string,
  mask: RouteMask
): Record<string, string> | null {
  const match = pathname.match(mask._fromRegex)
  if (!match) return null

  const params: Record<string, string> = {}
  mask._fromParams.forEach((paramName, index) => {
    params[paramName] = match[index + 1]
  })

  return params
}

/**
 * Builds the masked URL from a route mask and matched params.
 */
export function buildMaskedPath(
  mask: RouteMask,
  matchedParams: Record<string, string>
): string {
  // Determine which params to use
  let params: Record<string, string>
  if (mask.params === false) {
    params = {}
  } else if (typeof mask.params === 'function') {
    params = mask.params(matchedParams)
  } else {
    params = matchedParams
  }

  // Build the masked URL by replacing dynamic segments
  return mask.to
    .split('/')
    .map((segment) => {
      // Handle [...rest] or $...rest
      if (segment.startsWith('[...') && segment.endsWith(']')) {
        const paramName = segment.slice(4, -1)
        return params[paramName] ?? ''
      }
      if (segment.startsWith('$...')) {
        const paramName = segment.slice(4)
        return params[paramName] ?? ''
      }
      // Handle [id] or $id
      if (segment.startsWith('[') && segment.endsWith(']')) {
        const paramName = segment.slice(1, -1)
        return params[paramName] ?? ''
      }
      if (segment.startsWith('$')) {
        const paramName = segment.slice(1)
        return params[paramName] ?? ''
      }
      return segment
    })
    .join('/')
}

/**
 * URL-safe base64 encode for the _unmask suffix.
 * Replaces +/= with URL-safe characters so the param looks like an opaque token.
 */
export function encodeUnmask(path: string): string {
  return btoa(path).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

/**
 * Decode a URL-safe base64 _unmask value back to the original path.
 */
export function decodeUnmask(encoded: string): string {
  const base64 = encoded.replace(/-/g, '+').replace(/_/g, '/')
  return atob(base64)
}

/**
 * The separator used in the pathname postfix for route unmasking.
 * e.g. /photos/3__L3Bob3Rvcy8zL21vZGFs
 */
const UNMASK_SEPARATOR = '__'

/**
 * Parse the base64-encoded unmask suffix from a pathname.
 * Looks for `__` separator in the last path segment.
 * Returns the decoded actual path, or null if no unmask suffix found.
 *
 * @example
 * parseUnmaskFromPath('/photos/3__L3Bob3Rvcy8zL21vZGFs') // '/photos/3/modal'
 * parseUnmaskFromPath('/photos/3') // null
 */
export function parseUnmaskFromPath(pathname: string): string | null {
  const lastSlash = pathname.lastIndexOf('/')
  const lastSegment = pathname.slice(lastSlash + 1)
  const separatorIndex = lastSegment.indexOf(UNMASK_SEPARATOR)

  if (separatorIndex === -1) return null

  const encoded = lastSegment.slice(separatorIndex + UNMASK_SEPARATOR.length)
  if (!encoded) return null

  try {
    return decodeUnmask(encoded)
  } catch {
    return null
  }
}

/**
 * Finds a matching route mask for a given pathname.
 * Returns the mask result to apply, or undefined if no match.
 */
export function findMatchingMask(
  pathname: string,
  routeMasks: RouteMask[]
):
  | {
      maskedPath: string
      unmaskOnReload: boolean
      useSearchParam: boolean
      actualPath: string
    }
  | undefined {
  for (const mask of routeMasks) {
    const matchedParams = matchRouteMask(pathname, mask)
    if (matchedParams) {
      const maskedPath = buildMaskedPath(mask, matchedParams)
      const useSearchParam = mask.useSearchParam ?? false
      return {
        // If useSearchParam is true, append base64-encoded actual path as pathname postfix
        // e.g. /photos/3__L3Bob3Rvcy8zL21vZGFs
        maskedPath: useSearchParam
          ? `${maskedPath}${UNMASK_SEPARATOR}${encodeUnmask(pathname)}`
          : maskedPath,
        unmaskOnReload: mask.unmaskOnReload ?? false,
        useSearchParam,
        actualPath: pathname,
      }
    }
  }
  return undefined
}
