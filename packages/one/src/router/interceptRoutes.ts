import type { RouteNode, SlotConfig } from './Route'
import { matchDynamicName } from './matchers'

// ============================================
// Navigation Type Tracking
// ============================================

/**
 * Track whether current navigation is "soft" (client-side Link click) or
 * "hard" (direct URL, page refresh, browser back/forward).
 *
 * Soft navigation → intercept routes are active
 * Hard navigation → intercept routes are bypassed, full page renders
 */
let navigationMode: 'soft' | 'hard' = 'hard'

export function setNavigationType(type: 'soft' | 'hard') {
  navigationMode = type
}

export function getNavigationType(): 'soft' | 'hard' {
  return navigationMode
}

export function isHardNavigation(): boolean {
  return navigationMode === 'hard'
}

export function isSoftNavigation(): boolean {
  return navigationMode === 'soft'
}

// ============================================
// Intercept Route Matching
// ============================================

export interface InterceptResult {
  /** The intercept route that matched */
  interceptRoute: RouteNode
  /** The slot name this intercept belongs to */
  slotName: string
  /** Params extracted from the target path */
  params: Record<string, string>
}

/**
 * Find an intercept route that matches the target path.
 * Returns null if:
 * - Navigation is "hard" (direct URL, refresh)
 * - No intercept route matches the target path
 * - Layout has no slots defined
 *
 * @param targetPath - The path being navigated to (e.g., "/photos/5")
 * @param layoutNode - The current layout node to check for slots
 * @param currentPath - The current path before navigation (for relative matching)
 */
export function findInterceptRoute(
  targetPath: string,
  layoutNode: RouteNode | null,
  currentPath: string
): InterceptResult | null {
  // Never intercept on hard navigation (page load, refresh, direct URL)
  if (isHardNavigation()) {
    return null
  }

  // No layout or no slots defined
  if (!layoutNode?.slots || layoutNode.slots.size === 0) {
    return null
  }

  // Check each slot for matching intercept routes
  for (const [slotName, slotConfig] of layoutNode.slots) {
    const result = findMatchingInterceptInSlot(
      targetPath,
      slotName,
      slotConfig,
      layoutNode,
      currentPath
    )
    if (result) {
      return result
    }
  }

  return null
}

/**
 * Find a matching intercept route within a specific slot
 */
function findMatchingInterceptInSlot(
  targetPath: string,
  slotName: string,
  slotConfig: SlotConfig,
  layoutNode: RouteNode,
  currentPath: string
): InterceptResult | null {
  for (const interceptRoute of slotConfig.interceptRoutes) {
    if (!interceptRoute.intercept) continue

    const { levels, targetPath: interceptTargetPath } = interceptRoute.intercept

    // Resolve the full path this intercept targets
    const resolvedTargetPath = resolveInterceptTargetPath(
      interceptTargetPath,
      levels,
      layoutNode,
      currentPath
    )

    // Try to match the target path against the resolved intercept path
    const params = matchPath(targetPath, resolvedTargetPath)
    if (params !== null) {
      return {
        interceptRoute,
        slotName,
        params,
      }
    }
  }

  return null
}

/**
 * Resolve the full path an intercept route targets based on its level.
 *
 * Levels:
 * - 0 (from `.`): Same level as slot's parent layout
 * - 1 (from `..`): One level up from layout
 * - 2 (from `../..)`: Two levels up
 * - Infinity (from `...`): From app root
 */
function resolveInterceptTargetPath(
  interceptTargetPath: string,
  levels: number,
  layoutNode: RouteNode,
  currentPath: string
): string {
  // Get the base path for resolution
  const layoutPath = layoutNode.contextKey.replace(/\/_layout.*$/, '')

  if (levels === Infinity) {
    // (...) matches from root - target path is absolute
    return '/' + interceptTargetPath
  }

  if (levels === 0) {
    // (.) matches same level as the slot's parent layout
    return layoutPath + '/' + interceptTargetPath
  }

  // (..) matches parent level(s)
  const pathParts = layoutPath.split('/').filter(Boolean)
  const parentParts = pathParts.slice(0, -levels)
  return '/' + parentParts.join('/') + '/' + interceptTargetPath
}

/**
 * Match a path against a pattern and extract params.
 * Returns null if no match, or an object with extracted params.
 *
 * Pattern examples:
 * - "/photos/[id]" matches "/photos/5" → { id: "5" }
 * - "/users/[userId]/posts/[postId]" matches "/users/1/posts/2" → { userId: "1", postId: "2" }
 * - "/docs/[...slug]" matches "/docs/a/b/c" → { slug: "a/b/c" }
 */
function matchPath(
  path: string,
  pattern: string
): Record<string, string> | null {
  // Normalize paths
  const normalizedPath = '/' + path.replace(/^\/+/, '').replace(/\/+$/, '')
  const normalizedPattern = '/' + pattern.replace(/^\/+/, '').replace(/\/+$/, '')

  const pathParts = normalizedPath.split('/').filter(Boolean)
  const patternParts = normalizedPattern.split('/').filter(Boolean)

  const params: Record<string, string> = {}
  let pathIndex = 0

  for (let i = 0; i < patternParts.length; i++) {
    const patternPart = patternParts[i]
    const dynamicMatch = matchDynamicName(patternPart)

    if (dynamicMatch) {
      if (dynamicMatch.deep) {
        // Catch-all segment [...rest] - consume remaining path
        const remaining = pathParts.slice(pathIndex)
        if (remaining.length === 0) {
          // Catch-all can match empty for optional catch-all, but regular requires at least one
          return null
        }
        params[dynamicMatch.name] = remaining.join('/')
        return params
      } else {
        // Single dynamic segment [id]
        if (pathIndex >= pathParts.length) {
          return null
        }
        params[dynamicMatch.name] = pathParts[pathIndex]
        pathIndex++
      }
    } else {
      // Static segment - must match exactly
      if (pathIndex >= pathParts.length || pathParts[pathIndex] !== patternPart) {
        return null
      }
      pathIndex++
    }
  }

  // All pattern parts consumed, check if path is fully consumed
  if (pathIndex !== pathParts.length) {
    return null
  }

  return params
}

// ============================================
// URL Update Utilities
// ============================================

/**
 * Update the browser URL without triggering a full navigation.
 * Used when activating an intercept route to show the target URL.
 */
export function updateURLWithoutNavigation(href: string) {
  if (typeof window !== 'undefined') {
    window.history.pushState(
      {
        __intercepted: true,
        __actualPath: href,
      },
      '',
      href
    )
  }
}

/**
 * Check if the current navigation state is from an interception
 */
export function isInterceptedNavigation(): boolean {
  if (typeof window === 'undefined') return false
  return window.history.state?.__intercepted === true
}

/**
 * Get the actual path from an intercepted navigation
 */
export function getInterceptedActualPath(): string | null {
  if (typeof window === 'undefined') return null
  return window.history.state?.__actualPath ?? null
}
