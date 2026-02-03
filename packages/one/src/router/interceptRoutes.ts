import type { RouteNode, SlotConfig } from './Route'
import { matchDynamicName } from './matchers'
import { isNative } from '../constants'

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
  /** The layout's contextKey that owns this slot (for scoped state) */
  layoutContextKey: string
  /** Params extracted from the target path */
  params: Record<string, string>
}

/**
 * Recursively collect all layout nodes with slots from the entire route tree.
 */
function collectAllLayoutsWithSlots(
  node: RouteNode,
  collected: RouteNode[] = []
): RouteNode[] {
  if (node.slots && node.slots.size > 0) {
    collected.push(node)
  }

  if (node.children) {
    for (const child of node.children) {
      collectAllLayoutsWithSlots(child, collected)
    }
  }

  return collected
}

/**
 * Get the absolute path for a layout node based on its contextKey.
 * contextKey is like './app/settings/account/_layout.tsx'
 */
function getLayoutPath(node: RouteNode): string {
  // Extract path from contextKey
  let path = node.contextKey
    .replace(/^\.\//, '') // Remove leading ./
    .replace(/\/?_layout.*$/, '') // Remove _layout and extension
    .replace(/^app\/?/, '') // Remove 'app/' prefix

  // Normalize to absolute path
  return '/' + path
}

/**
 * Check if a layout path is an ancestor of (or equal to) the current path.
 * A layout at /settings/account is an ancestor of /settings/account/foo
 */
function isLayoutAncestorOfPath(layoutPath: string, currentPath: string): boolean {
  // Normalize paths
  const normalizedLayout = layoutPath.replace(/\/+$/, '') || '/'
  const normalizedCurrent = currentPath.replace(/\/+$/, '') || '/'

  // Root layout is ancestor of everything
  if (normalizedLayout === '/') return true

  // Check if current path starts with layout path
  return (
    normalizedCurrent === normalizedLayout ||
    normalizedCurrent.startsWith(normalizedLayout + '/')
  )
}

/**
 * Find all layout nodes with slots that are ancestors of the current path.
 * This enables nested intercept routes (e.g., /settings/account/@modal).
 */
function findLayoutsWithSlotsAlongPath(
  rootNode: RouteNode | null,
  currentPath: string
): RouteNode[] {
  if (!rootNode) return []

  // Collect all layouts with slots from the entire tree
  const allLayoutsWithSlots = collectAllLayoutsWithSlots(rootNode)

  // Filter to only those that are ancestors of the current path
  const ancestorLayouts = allLayoutsWithSlots.filter((layout) => {
    const layoutPath = getLayoutPath(layout)
    return isLayoutAncestorOfPath(layoutPath, currentPath)
  })

  // Sort by path depth (shallowest first) so we can check deepest last
  ancestorLayouts.sort((a, b) => {
    const depthA = getLayoutPath(a).split('/').filter(Boolean).length
    const depthB = getLayoutPath(b).split('/').filter(Boolean).length
    return depthA - depthB
  })

  return ancestorLayouts
}

/**
 * Find an intercept route that matches the target path.
 * Checks all layouts with slots along the current path (supports nested intercepts).
 *
 * Returns null if:
 * - Navigation is "hard" (direct URL, refresh)
 * - No intercept route matches the target path
 * - No layouts with slots found along current path
 *
 * @param targetPath - The path being navigated to (e.g., "/photos/5")
 * @param rootNode - The root layout node to start traversal from
 * @param currentPath - The current path before navigation (for relative matching)
 */
export function findInterceptRoute(
  targetPath: string,
  rootNode: RouteNode | null,
  currentPath: string
): InterceptResult | null {
  // Never intercept on native - no browser history API available
  if (isNative) {
    return null
  }

  // Never intercept on hard navigation (page load, refresh, direct URL)
  if (isHardNavigation()) {
    return null
  }

  // Find all layouts with slots along the current path
  const layoutsWithSlots = findLayoutsWithSlotsAlongPath(rootNode, currentPath)

  if (layoutsWithSlots.length === 0) {
    return null
  }

  // Check each layout along the path for matching intercepts
  // Start from deepest (most specific) to shallowest (root)
  for (let i = layoutsWithSlots.length - 1; i >= 0; i--) {
    const layoutNode = layoutsWithSlots[i]

    for (const [slotName, slotConfig] of layoutNode.slots!) {
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
    if (!interceptRoute.intercept) {
      continue
    }

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
        layoutContextKey: layoutNode.contextKey,
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
  // contextKey is like './app/_layout.tsx' or './_layout.tsx'
  // We need to extract just the route path portion
  let layoutPath = layoutNode.contextKey
    .replace(/^\.\//, '') // Remove leading ./
    .replace(/\/?_layout.*$/, '') // Remove _layout and extension (with optional leading /)
    .replace(/^app\/?/, '') // Remove 'app/' prefix since routes are relative to app dir

  // Normalize: empty string or '/' means root
  if (!layoutPath || layoutPath === '/') {
    layoutPath = ''
  }

  if (levels === Infinity) {
    // (...) matches from root - target path is absolute
    return '/' + interceptTargetPath
  }

  if (levels === 0) {
    // (.) matches same level as the slot's parent layout
    // For root layout (empty layoutPath), just use the target path
    const basePath = layoutPath ? '/' + layoutPath : ''
    return basePath + '/' + interceptTargetPath
  }

  // (..) matches parent level(s)
  const pathParts = layoutPath.split('/').filter(Boolean)
  const parentParts = pathParts.slice(0, -levels)
  const parentPath = parentParts.length > 0 ? '/' + parentParts.join('/') : ''
  return parentPath + '/' + interceptTargetPath
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
function matchPath(path: string, pattern: string): Record<string, string> | null {
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

// Track the URL before interception so we can restore it on close
let preInterceptUrl: string | null = null

/**
 * Update the browser URL without triggering a full navigation.
 * Used when activating an intercept route to show the target URL.
 */
export function updateURLWithoutNavigation(href: string) {
  if (typeof window !== 'undefined') {
    // Store the URL before we change it
    preInterceptUrl = window.location.pathname + window.location.search

    window.history.pushState(
      {
        __intercepted: true,
        __actualPath: href,
        __preInterceptUrl: preInterceptUrl,
      },
      '',
      href
    )
  }
}

// Callback to clear slot states - set from Navigator.tsx to avoid circular deps
let clearSlotStatesCallback: (() => void) | null = null

export function registerClearSlotStates(callback: () => void) {
  clearSlotStatesCallback = callback
}

/**
 * Close the current intercept and restore the previous URL.
 * This should be called from modal close handlers instead of router.back().
 */
export function closeIntercept(): boolean {
  if (typeof window === 'undefined') return false

  const state = window.history.state
  if (!state?.__intercepted) {
    return false
  }

  // Set flag BEFORE history.back() so popstate handler knows to skip hard nav mode
  returningFromIntercept = true

  // Clear slot state first (triggers re-render to hide modal)
  clearSlotStatesCallback?.()

  // Go back in browser history to pop our pushState entry
  // The popstate handler will check returningFromIntercept and skip setting hard mode
  window.history.back()

  return true
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

/**
 * Get the URL from before the interception
 */
export function getPreInterceptUrl(): string | null {
  if (typeof window === 'undefined') return null
  return window.history.state?.__preInterceptUrl ?? preInterceptUrl
}

/**
 * Check if we're returning from an intercepted state (popstate from intercept closure).
 * This helps distinguish between user closing an intercept modal vs regular back navigation.
 */
let returningFromIntercept = false

export function setReturningFromIntercept(value: boolean) {
  returningFromIntercept = value
}

export function isReturningFromIntercept(): boolean {
  return returningFromIntercept
}

// Store intercept state info for forward navigation restoration
interface StoredInterceptState {
  slotName: string
  routeContextKey: string
  params: Record<string, string>
}

// Callback to set slot state - set from Navigator.tsx to avoid circular deps
let setSlotStateCallback:
  | ((
      slotName: string,
      state: {
        activeRouteKey: string | null
        activeRouteNode?: any
        params?: Record<string, string>
        isIntercepted: boolean
      } | null
    ) => void)
  | null = null

export function registerSetSlotState(callback: typeof setSlotStateCallback) {
  setSlotStateCallback = callback
}

// Store the intercept route node for restoration
let lastInterceptRouteNode: any = null
let lastInterceptSlotName: string | null = null
let lastInterceptParams: Record<string, string> | null = null

export function storeInterceptState(
  slotName: string,
  routeNode: any,
  params: Record<string, string>
) {
  lastInterceptSlotName = slotName
  lastInterceptRouteNode = routeNode
  lastInterceptParams = params
}

/**
 * Try to restore an intercept from browser history state (forward navigation).
 * Returns true if an intercept was restored, false otherwise.
 */
export function restoreInterceptFromHistory(): boolean {
  if (typeof window === 'undefined') return false

  const state = window.history.state
  if (!state?.__intercepted) {
    return false
  }

  // We have an intercepted state - try to restore it
  if (lastInterceptRouteNode && lastInterceptSlotName && setSlotStateCallback) {
    setSlotStateCallback(lastInterceptSlotName, {
      activeRouteKey: lastInterceptRouteNode.contextKey,
      activeRouteNode: lastInterceptRouteNode,
      params: lastInterceptParams || {},
      isIntercepted: true,
    })
    return true
  }

  return false
}
