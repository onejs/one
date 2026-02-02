/**
 * Note: this entire module is exported as an interface router.*
 * We need to treat exports as an API and not change them, maybe not
 * the best decision.
 */

import {
  type NavigationContainerRefWithCurrent,
  StackActions,
} from '@react-navigation/native'
import {
  type ComponentType,
  Fragment,
  startTransition,
  useDeferredValue,
  useSyncExternalStore,
} from 'react'
import { Platform } from 'react-native'
import { devtoolsRegistry } from '../devtools/registry'
import type { OneRouter } from '../interfaces/router'
import { resolveHref } from '../link/href'
import { openExternalURL } from '../link/openExternalURL'
import { resolve } from '../link/path'
import { checkBlocker } from '../useBlocker'
import { assertIsReady } from '../utils/assertIsReady'
import { getLoaderPath, getPreloadCSSPath, getPreloadPath } from '../utils/cleanUrl'
import { dynamicImport } from '../utils/dynamicImport'
import { shouldLinkExternally } from '../utils/url'
import {
  ParamValidationError,
  RouteValidationError,
  validateParams as runValidateParams,
} from '../validateParams'
import type { One } from '../vite/types'
import {
  extractParamsFromState,
  extractPathnameFromHref,
  extractSearchFromHref,
  findRouteNodeFromState,
  findAllRouteNodesFromState,
} from './findRouteNode'
import type { UrlObject } from './getNormalizedStatePath'
import { getRouteInfo } from './getRouteInfo'
import { getRoutes } from './getRoutes'
import { setLastAction } from './lastAction'
import { getLinking, resetLinking, setupLinking } from './linkingConfig'
import type { RouteNode } from './Route'
import { sortRoutes } from './sortRoutes'
import { getQualifiedRouteComponent } from './useScreens'
import { preloadRouteModules } from './useViteRoutes'
import { getNavigateAction } from './utils/getNavigateAction'
import { setClientMatches } from '../useMatches'
import type { RouteMatch } from '../useMatches'
import {
  findInterceptRoute,
  setNavigationType,
  updateURLWithoutNavigation,
  storeInterceptState,
} from './interceptRoutes'
import { setSlotState } from '../views/Navigator'

// Module-scoped variables
export let routeNode: RouteNode | null = null
export let rootComponent: ComponentType

// Global registry for protected routes
// Key: contextKey (e.g., '/protected-test'), Value: Set of protected route names
const protectedRouteRegistry = new Map<string, Set<string>>()

/**
 * Register protected routes for a navigator context.
 * Called by navigators when their protectedScreens changes.
 */
export function registerProtectedRoutes(
  contextKey: string,
  protectedScreens: Set<string>
) {
  if (protectedScreens.size === 0) {
    protectedRouteRegistry.delete(contextKey)
  } else {
    protectedRouteRegistry.set(contextKey, protectedScreens)
  }
}

/**
 * Unregister protected routes for a navigator context.
 * Called when a navigator unmounts.
 */
export function unregisterProtectedRoutes(contextKey: string) {
  protectedRouteRegistry.delete(contextKey)
}

/**
 * Check if a route path is protected and should be blocked.
 * Returns true if the route is protected.
 */
export function isRouteProtected(href: string): boolean {
  // Normalize the href (remove leading/trailing slashes)
  const normalizedHref = href.replace(/^\/+|\/+$/g, '')

  // Check each navigator context to see if this route is protected
  for (const [contextKey, protectedScreens] of protectedRouteRegistry) {
    const normalizedContextKey = contextKey.replace(/^\/+|\/+$/g, '')

    // Check if this href is under this context
    if (normalizedHref.startsWith(normalizedContextKey)) {
      // Get the route name relative to this context
      const relativePath = normalizedHref
        .slice(normalizedContextKey.length)
        .replace(/^\//, '')
      const routeName = relativePath.split('/')[0] || 'index'

      if (protectedScreens.has(routeName)) {
        return true
      }
    }
  }

  return false
}

export let hasAttemptedToHideSplash = false
export let initialState: OneRouter.ResultState | undefined
export let rootState: OneRouter.ResultState | undefined

let nextState: OneRouter.ResultState | undefined
export let routeInfo: UrlObject | undefined
let splashScreenAnimationFrame: number | undefined

// we always set it
export let navigationRef: OneRouter.NavigationRef = null as any
let navigationRefSubscription: () => void

const rootStateSubscribers = new Set<OneRouter.RootStateListener>()
const loadingStateSubscribers = new Set<OneRouter.LoadingStateListener>()
const storeSubscribers = new Set<() => void>()

// current matches for useMatches hook (cached on client)
let currentMatches: RouteMatch[] = []

// Validation state tracking
export type ValidationState = {
  status: 'idle' | 'validating' | 'error' | 'valid'
  error?: Error
  lastValidatedHref?: string
}

let validationState: ValidationState = { status: 'idle' }
const validationStateSubscribers = new Set<(state: ValidationState) => void>()

export function subscribeToValidationState(subscriber: (state: ValidationState) => void) {
  validationStateSubscribers.add(subscriber)
  return () => validationStateSubscribers.delete(subscriber)
}

export function setValidationState(state: ValidationState) {
  validationState = state
  for (const subscriber of validationStateSubscribers) {
    subscriber(state)
  }
  // Dispatch event for devtools
  if (
    process.env.TAMAGUI_TARGET !== 'native' &&
    state.status === 'error' &&
    state.error
  ) {
    window.dispatchEvent(
      new CustomEvent('one-validation-error', {
        detail: {
          error: {
            message: state.error.message,
            name: state.error.name,
            stack: state.error.stack,
          },
          href: state.lastValidatedHref,
          timestamp: Date.now(),
        },
      })
    )
  }
}

export function getValidationState(): ValidationState {
  return validationState
}

export function useValidationState() {
  return useSyncExternalStore(
    subscribeToValidationState,
    getValidationState,
    getValidationState
  )
}

// Initialize function
export function initialize(
  context: One.RouteContext,
  ref: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
  initialLocation?: URL
) {
  cleanUpState()

  routeNode = getRoutes(context, {
    ignoreEntryPoints: true,
    platform: Platform.OS,
  })

  rootComponent = routeNode ? getQualifiedRouteComponent(routeNode) : Fragment

  if (!routeNode && process.env.NODE_ENV === 'production') {
    throw new Error('No routes found')
  }

  if (process.env.ONE_DEBUG_ROUTER && routeNode) {
    const formatRouteTree = (node: RouteNode, indent = '', isLast = true): string => {
      const prefix = indent + (isLast ? '└─ ' : '├─ ')
      const childIndent = indent + (isLast ? '   ' : '│  ')

      const dynamicBadge = node.dynamic
        ? ` [${node.dynamic.map((d) => d.name).join(', ')}]`
        : ''
      const typeBadge = node.type !== 'layout' ? ` (${node.type})` : ''
      const slotsBadge = node.slots?.size ? ` {@${Array.from(node.slots.keys()).join(', @')}}` : ''
      const routeName = node.route || '/'

      let line = `${prefix}${routeName}${dynamicBadge}${typeBadge}${slotsBadge}`

      const visibleChildren = node.children.filter((child) => !child.internal)
      for (let i = 0; i < visibleChildren.length; i++) {
        const child = visibleChildren[i]
        const childIsLast = i === visibleChildren.length - 1
        line += '\n' + formatRouteTree(child, childIndent, childIsLast)
      }

      return line
    }

    console.info(`[one] 📍 Route structure:\n${formatRouteTree(routeNode)}`)

    // Log slot details
    if (routeNode.slots?.size) {
      console.info(`[one] 📦 Slots on root layout:`)
      for (const [slotName, slotConfig] of routeNode.slots) {
        console.info(`  @${slotName}:`, {
          defaultRoute: slotConfig.defaultRoute?.route,
          interceptRoutes: slotConfig.interceptRoutes.map((r) => ({
            route: r.route,
            intercept: r.intercept,
          })),
        })
      }
    }
  }

  navigationRef = ref as unknown as OneRouter.NavigationRef
  setupLinkingAndRouteInfo(initialLocation)
  subscribeToNavigationChanges()
}

function cleanUpState() {
  initialState = undefined
  rootState = undefined
  nextState = undefined
  routeInfo = undefined
  resetLinking()
  navigationRefSubscription?.()
  rootStateSubscribers.clear()
  storeSubscribers.clear()
}

function setupLinkingAndRouteInfo(initialLocation?: URL) {
  initialState = setupLinking(routeNode, initialLocation)

  if (initialState) {
    rootState = initialState
    routeInfo = getRouteInfo(initialState)
  } else {
    routeInfo = {
      unstable_globalHref: '',
      pathname: '',
      isIndex: false,
      params: {},
      segments: [],
    }
  }
}

function subscribeToNavigationChanges() {
  navigationRefSubscription = navigationRef.addListener('state', (data) => {
    let state = { ...data.data.state } as OneRouter.ResultState

    if (state.key) {
      if (hashes[state.key]) {
        state.hash = hashes[state.key]
        delete hashes[state.key]
      }
    }

    if (!hasAttemptedToHideSplash) {
      hasAttemptedToHideSplash = true
      splashScreenAnimationFrame = requestAnimationFrame(() => {
        // SplashScreen._internal_maybeHideAsync?.();
      })
    }

    if (nextOptions) {
      state = { ...state, linkOptions: nextOptions }
      nextOptions = null
    }

    let shouldUpdateSubscribers = nextState === state
    nextState = undefined

    if (state && state !== rootState) {
      updateState(state, undefined)
      shouldUpdateSubscribers = true
    }

    if (shouldUpdateSubscribers) {
      startTransition(() => {
        for (const subscriber of rootStateSubscribers) {
          subscriber(state)
        }
      })
    }
  })

  startTransition(() => {
    updateSnapshot()
    for (const subscriber of storeSubscribers) {
      subscriber()
    }
  })
}

// Navigation functions
export function navigate(url: OneRouter.Href, options?: OneRouter.LinkToOptions) {
  return linkTo(resolveHref(url), 'NAVIGATE', options)
}

export function push(url: OneRouter.Href, options?: OneRouter.LinkToOptions) {
  return linkTo(resolveHref(url), 'PUSH', options)
}

export function dismiss(count?: number) {
  if (process.env.ONE_DEBUG_ROUTER) {
    console.info(`[one] 🔙 dismiss${count ? ` (${count})` : ''}`)
  }
  navigationRef?.dispatch(StackActions.pop(count))
}

export function replace(url: OneRouter.Href, options?: OneRouter.LinkToOptions) {
  return linkTo(resolveHref(url), 'REPLACE', options)
}

export function setParams(params: OneRouter.InpurRouteParamsGeneric = {}) {
  assertIsReady(navigationRef)
  return navigationRef?.current?.setParams(
    // @ts-expect-error
    params
  )
}

export function dismissAll() {
  if (process.env.ONE_DEBUG_ROUTER) {
    console.info(`[one] 🔙 dismissAll`)
  }
  navigationRef?.dispatch(StackActions.popToTop())
}

export function goBack() {
  if (process.env.ONE_DEBUG_ROUTER) {
    console.info(`[one] 🔙 goBack`)
  }
  assertIsReady(navigationRef)
  navigationRef?.current?.goBack()
}

export function canGoBack(): boolean {
  if (!navigationRef.isReady()) {
    return false
  }
  return navigationRef?.current?.canGoBack() ?? false
}

export function canDismiss(): boolean {
  let state = rootState

  while (state) {
    if (state.type === 'stack' && state.routes.length > 1) {
      return true
    }
    if (state.index === undefined) {
      return false
    }
    state = state.routes?.[state.index]?.state as any
  }

  return false
}

export function getSortedRoutes() {
  if (!routeNode) {
    throw new Error('No routes')
  }
  return routeNode.children.filter((route) => !route.internal).sort(sortRoutes)
}

export function updateState(state: OneRouter.ResultState, nextStateParam = state) {
  rootState = state
  nextState = nextStateParam

  const nextRouteInfo = getRouteInfo(state)

  if (!deepEqual(routeInfo, nextRouteInfo)) {
    if (process.env.ONE_DEBUG_ROUTER) {
      const from = routeInfo?.pathname || '(initial)'
      const to = nextRouteInfo.pathname
      const params = Object.keys(nextRouteInfo.params || {}).length
        ? nextRouteInfo.params
        : undefined
      console.info(`[one] 🧭 ${from} → ${to}`, params ? { params } : '')
    }
    routeInfo = nextRouteInfo

    // On native, update client matches when route changes
    // This enables useMatches to work for initial route and navigation
    // Loader data will be undefined initially (fetched by useLoader)
    if (process.env.TAMAGUI_TARGET === 'native') {
      const params = extractParamsFromState(state)
      const newMatches = buildNativeMatches(state, nextRouteInfo.pathname, params)
      currentMatches = newMatches
      setClientMatches(newMatches)
    }
  }

  // Expose devtools API in development
  if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
    // Use registry to avoid circular deps - useLoader registers its function there
    ;(window as any).__oneDevtools = {
      routeInfo: nextRouteInfo,
      rootState: state,
      routeNode,
      getRoutes: () => routeNode?.children || [],
      getLoaderTimingHistory: () => devtoolsRegistry.getLoaderTimingHistory?.() ?? [],
      getPreloadHistory,
    }
    // Dispatch event for devtools panels to listen
    if (process.env.TAMAGUI_TARGET !== 'native') {
      window.dispatchEvent(new CustomEvent('one-route-change', { detail: nextRouteInfo }))
    }
  }
}

// Subscription functions
export function subscribeToRootState(subscriber: OneRouter.RootStateListener) {
  rootStateSubscribers.add(subscriber)
  return () => {
    rootStateSubscribers.delete(subscriber)
  }
}

export function subscribeToStore(subscriber: () => void) {
  storeSubscribers.add(subscriber)
  return () => {
    storeSubscribers.delete(subscriber)
  }
}

// Subscription functions
export function subscribeToLoadingState(subscriber: OneRouter.LoadingStateListener) {
  loadingStateSubscribers.add(subscriber)
  return () => {
    loadingStateSubscribers.delete(subscriber)
  }
}

export function setLoadingState(state: OneRouter.LoadingState) {
  startTransition(() => {
    for (const listener of loadingStateSubscribers) {
      listener(state)
    }
  })
}

// Snapshot function

let currentSnapshot: ReturnType<typeof getSnapshot> | null = null

function updateSnapshot() {
  currentSnapshot = getSnapshot()
}

export function snapshot() {
  return currentSnapshot!
}

function getSnapshot() {
  return {
    linkTo,
    routeNode,
    rootComponent,
    linking: getLinking(),
    hasAttemptedToHideSplash,
    initialState,
    rootState,
    nextState,
    routeInfo,
    splashScreenAnimationFrame,
    navigationRef,
    navigationRefSubscription,
    rootStateSubscribers,
    storeSubscribers,
  }
}

export function rootStateSnapshot() {
  return rootState!
}

export function routeInfoSnapshot() {
  return routeInfo!
}

// Hook functions
export function useOneRouter() {
  const state = useSyncExternalStore(subscribeToStore, snapshot, snapshot)
  // useDeferredValue makes the transition concurrent, preventing main thread blocking
  return useDeferredValue(state)
}

function syncStoreRootState() {
  if (!navigationRef) {
    throw new Error(`No navigationRef, possible duplicate One dep`)
  }
  if (navigationRef.isReady()) {
    const currentState = navigationRef.getRootState() as unknown as OneRouter.ResultState
    if (rootState !== currentState) {
      updateState(currentState)
    }
  }
}

export function useStoreRootState() {
  syncStoreRootState()
  const state = useSyncExternalStore(
    subscribeToRootState,
    rootStateSnapshot,
    rootStateSnapshot
  )
  return useDeferredValue(state)
}

export function useStoreRouteInfo() {
  syncStoreRootState()
  const state = useSyncExternalStore(
    subscribeToRootState,
    routeInfoSnapshot,
    routeInfoSnapshot
  )
  // note: we intentionally don't use useDeferredValue here because it can cause
  // layout flash when conditional rendering depends on pathname. the deferred value
  // delays the parent layout's update while nested layouts have already unmounted.
  return state
}

// Cleanup function
export function cleanup() {
  if (splashScreenAnimationFrame) {
    cancelAnimationFrame(splashScreenAnimationFrame)
  }
}

export const preloadingLoader: Record<string, Promise<any> | undefined> = {}

// inlined to ensure tree shakes away in prod
// dev mode preload - fetches just the loader directly without production preload bundles
async function doPreloadDev(href: string): Promise<any> {
  if (process.env.NODE_ENV === 'development') {
    const startTime = performance.now()
    const normalizedPath = normalizeLoaderPath(href)

    try {
      const loaderJSUrl = getLoaderPath(href, true)

      const moduleLoadStart = performance.now()
      const modulePromise = dynamicImport(loaderJSUrl)
      if (!modulePromise) {
        return null
      }
      const module = await modulePromise.catch(() => null)
      const moduleLoadTime = performance.now() - moduleLoadStart

      if (!module?.loader) {
        return null
      }

      const executionStart = performance.now()
      const result = await module.loader()
      const executionTime = performance.now() - executionStart
      const totalTime = performance.now() - startTime

      // record timing for devtools
      devtoolsRegistry.recordLoaderTiming?.({
        path: normalizedPath,
        startTime,
        moduleLoadTime,
        executionTime,
        totalTime,
        source: 'preload',
      })

      return result ?? null
    } catch (err) {
      const totalTime = performance.now() - startTime

      // record error timing for devtools
      devtoolsRegistry.recordLoaderTiming?.({
        path: normalizedPath,
        startTime,
        totalTime,
        error: err instanceof Error ? err.message : String(err),
        source: 'preload',
      })

      // graceful fail - loader will be fetched when component mounts
      if (process.env.ONE_DEBUG_ROUTER) {
        console.warn(`[one] dev preload failed for ${href}:`, err)
      }
      return null
    }
  }
}

async function doPreload(href: string) {
  const preloadPath = getPreloadPath(href)
  const loaderPath = getLoaderPath(href)
  const cssPreloadPath = getPreloadCSSPath(href)

  recordPreloadStart(href)

  try {
    const [_preload, cssPreloadModule, loader] = await Promise.all([
      dynamicImport(preloadPath),
      dynamicImport(cssPreloadPath)?.catch(() => null) ?? Promise.resolve(null), // graceful fail if no CSS preload
      dynamicImport(loaderPath)?.catch(() => null) ?? Promise.resolve(null), // graceful fail if no loader file
      preloadRouteModules(href),
    ])

    // Store the CSS inject function for later use on navigation
    const hasCss = !!cssPreloadModule?.injectCSS
    if (hasCss) {
      cssInjectFunctions[href] = cssPreloadModule.injectCSS
    }

    const hasLoader = !!loader?.loader
    if (!hasLoader) {
      recordPreloadComplete(href, false, hasCss)
      return null
    }

    const result = await loader.loader()
    recordPreloadComplete(href, true, hasCss)
    return result ?? null
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err)
    console.error(`[one] preload error for ${href}:`, err)
    recordPreloadError(href, errorMessage)
    return null
  }
}

// Store resolved preload data separately from promises
export const preloadedLoaderData: Record<string, any> = {}

// Store CSS inject functions for calling on navigation
const cssInjectFunctions: Record<string, (() => Promise<void[]>) | undefined> = {}

// Preload status tracking for devtools
export type PreloadStatus = 'pending' | 'loading' | 'loaded' | 'error'
export type PreloadEntry = {
  href: string
  status: PreloadStatus
  startTime: number
  endTime?: number
  error?: string
  hasLoader: boolean
  hasCss: boolean
}

const preloadHistory: PreloadEntry[] = []
const MAX_PRELOAD_HISTORY = 30

// Preload tracking functions - only do work in development for devtools
function recordPreloadStart(href: string) {
  if (process.env.NODE_ENV !== 'development') return

  const existing = preloadHistory.find((p) => p.href === href)
  if (existing) {
    existing.status = 'loading'
    existing.startTime = performance.now()
    return
  }
  preloadHistory.unshift({
    href,
    status: 'loading',
    startTime: performance.now(),
    hasLoader: false,
    hasCss: false,
  })
  if (preloadHistory.length > MAX_PRELOAD_HISTORY) {
    preloadHistory.pop()
  }
  dispatchPreloadEvent()
}

function recordPreloadComplete(href: string, hasLoader: boolean, hasCss: boolean) {
  if (process.env.NODE_ENV !== 'development') return

  const entry = preloadHistory.find((p) => p.href === href)
  if (entry) {
    entry.status = 'loaded'
    entry.endTime = performance.now()
    entry.hasLoader = hasLoader
    entry.hasCss = hasCss
  }
  dispatchPreloadEvent()
}

function recordPreloadError(href: string, error: string) {
  if (process.env.NODE_ENV !== 'development') return

  const entry = preloadHistory.find((p) => p.href === href)
  if (entry) {
    entry.status = 'error'
    entry.endTime = performance.now()
    entry.error = error
  }
  dispatchPreloadEvent()
}

function dispatchPreloadEvent() {
  if (process.env.TAMAGUI_TARGET !== 'native') {
    window.dispatchEvent(new CustomEvent('one-preload-update'))
  }
}

export function getPreloadHistory(): PreloadEntry[] {
  return preloadHistory
}

export function preloadRoute(href: string, injectCSS = false): Promise<any> | undefined {
  if (process.env.TAMAGUI_TARGET !== 'native') {
    // in dev mode, use a simpler preload that just fetches the loader directly
    // this avoids issues with production-only preload paths while still ensuring
    // loader data is available before navigation completes
    if (process.env.NODE_ENV === 'development') {
      // normalize the path to match what useLoader uses for cache keys
      const normalizedHref = normalizeLoaderPath(href)
      if (!preloadingLoader[normalizedHref]) {
        preloadingLoader[normalizedHref] = doPreloadDev(href).then((data) => {
          preloadedLoaderData[normalizedHref] = data
          return data
        })
      }
      return preloadingLoader[normalizedHref]
    }

    if (!preloadingLoader[href]) {
      preloadingLoader[href] = doPreload(href).then((data) => {
        // Store the resolved data for synchronous access
        preloadedLoaderData[href] = data
        return data
      })
    }

    if (injectCSS) {
      // Wait for preload to populate cssInjectFunctions, then inject CSS (max 800ms)
      return preloadingLoader[href]?.then(async (data) => {
        const inject = cssInjectFunctions[href]
        if (inject) {
          await Promise.race([inject(), new Promise((r) => setTimeout(r, 800))])
        }
        return data
      })
    }

    return preloadingLoader[href]
  }
}

// normalize path to match what useLoader uses for currentPath
function normalizeLoaderPath(href: string): string {
  // remove search params and hash, normalize trailing slashes and /index
  const url = new URL(href, 'http://example.com')
  return url.pathname.replace(/\/index$/, '').replace(/\/$/, '') || '/'
}

/**
 * Build matches array for client-side navigation.
 * Preserves layout matches (cached from SSR) and updates page match with fresh data.
 *
 * Strategy: Since layouts don't re-run on client navigation, we keep all layout matches
 * from the current cached matches and only update the page match.
 */
function buildClientMatches(
  href: string,
  matchingNode: RouteNode | null,
  params: Record<string, string | string[]>,
  loaderData: unknown
): RouteMatch[] {
  const pathname = extractPathnameFromHref(href)
  const routeId = matchingNode?.contextKey || pathname

  // preserve all layout matches (those with _layout in routeId) from current state
  // since layout loaders don't re-run on client navigation
  const layoutMatches = currentMatches.filter((m) => m.routeId.includes('_layout'))

  // create the new page match with fresh loader data
  const pageMatch: RouteMatch = {
    routeId,
    pathname,
    params,
    loaderData,
  }

  // return layouts + new page match
  return [...layoutMatches, pageMatch]
}

/**
 * Build all matches for native, including layouts and page.
 * Unlike web which preserves SSR-hydrated layouts, native builds fresh
 * since there's no SSR context to hydrate from.
 */
function buildNativeMatches(
  state: OneRouter.ResultState,
  pathname: string,
  params: Record<string, string | string[]>
): RouteMatch[] {
  const allNodes = findAllRouteNodesFromState(state, routeNode)
  return allNodes.map((node) => ({
    routeId: node.contextKey || pathname,
    pathname,
    params,
    loaderData: undefined, // loader data is fetched async by useLoader on native
  }))
}

/**
 * Initialize client matches from server context during hydration.
 * Called from createApp when hydrating.
 */
export function initClientMatches(matches: RouteMatch[]) {
  currentMatches = matches
  setClientMatches(matches)
}

export async function linkTo(
  href: string,
  event?: string,
  options?: OneRouter.LinkToOptions
) {
  if (process.env.ONE_DEBUG_ROUTER) {
    console.info(`[one] 🔗 ${event || 'NAVIGATE'} ${href}`)
  }

  // Mark this as a soft navigation (client-side Link click)
  // This enables intercepting routes to activate
  setNavigationType('soft')

  if (href[0] === '#') {
    // this is just linking to a section of the current page on web
    return
  }

  if (shouldLinkExternally(href)) {
    openExternalURL(href)
    return
  }

  // Check if any blocker wants to block this navigation (web only)
  if (checkBlocker(href, event === 'REPLACE' ? 'replace' : 'push')) {
    return
  }

  // Check if the route is protected and should be blocked
  if (isRouteProtected(href)) {
    return
  }

  // Check for intercepting routes (parallel routes with @slot)
  // This enables modal patterns where soft nav shows modal, hard nav shows full page
  // Pass root node - findInterceptRoute will traverse to find all layouts with slots along the current path
  const currentLayoutNode = routeNode
  const currentPath = routeInfo?.pathname || '/'

  // DEBUG: Always log intercept checking
  console.log('[one] 🔍 linkTo checking intercept:', {
    href,
    hasRouteNode: !!routeNode,
    hasSlots: !!routeNode?.slots,
    slotsSize: routeNode?.slots?.size,
    slotNames: routeNode?.slots ? Array.from(routeNode.slots.keys()) : [],
  })

  const interceptResult = findInterceptRoute(href, currentLayoutNode, currentPath)

  console.log('[one] 🔍 findInterceptRoute result:', interceptResult)

  // Skip intercept handling if no result (native or hard navigation)
  if (!interceptResult) {
    console.log('[one] 🔍 No intercept, proceeding with normal navigation')
  }

  if (interceptResult) {
    // Found an intercept route! Render in slot instead of full navigation
    const { interceptRoute, slotName, params } = interceptResult

    console.log(`[one] 🎯 Intercepting ${href} → slot @${slotName}`, {
      params,
      interceptRoute: {
        route: interceptRoute.route,
        contextKey: interceptRoute.contextKey,
        intercept: interceptRoute.intercept,
      },
    })

    // Store intercept state for forward navigation restoration
    storeInterceptState(slotName, interceptRoute, params)

    // Update URL to show the target path (not the intercept route path)
    updateURLWithoutNavigation(href)

    // Activate the slot to render the intercept route
    setSlotState(slotName, {
      activeRouteKey: interceptRoute.contextKey,
      activeRouteNode: interceptRoute,
      params,
      isIntercepted: true,
    })

    return
  }

  console.log('[one] 🚀 Starting normal navigation to:', href)

  assertIsReady(navigationRef)
  const current = navigationRef.current

  if (current == null) {
    throw new Error(
      "Couldn't find a navigation object. Is your component inside NavigationContainer?"
    )
  }

  const linking = getLinking()

  if (!linking) {
    throw new Error('Attempted to link to route when no routes are present')
  }

  setLastAction()

  if (href === '..' || href === '../') {
    console.log('[one] 🚀 Going back')
    current.goBack()
    return
  }

  if (href.startsWith('.')) {
    // Resolve base path by merging the current segments with the params
    let base =
      routeInfo?.segments
        ?.map((segment) => {
          if (!segment.startsWith('[')) return segment

          if (segment.startsWith('[...')) {
            segment = segment.slice(4, -1)
            const params = routeInfo?.params?.[segment]
            if (Array.isArray(params)) {
              return params.join('/')
            }
            return params?.split(',')?.join('/') ?? ''
          }
          segment = segment.slice(1, -1)
          return routeInfo?.params?.[segment]
        })
        .filter(Boolean)
        .join('/') ?? '/'

    if (!routeInfo?.isIndex) {
      base += '/..'
    }

    href = resolve(base, href)
    console.log('[one] 🚀 Resolved relative href to:', href)
  }

  console.log('[one] 🚀 Getting state from path:', href)
  const state = linking.getStateFromPath!(href, linking.config)
  console.log('[one] 🚀 Got state:', state ? 'valid' : 'null', state?.routes?.length, 'routes')

  if (!state || state.routes.length === 0) {
    console.error(
      'Could not generate a valid navigation state for the given path: ' + href
    )
    console.error(`linking.config`, linking.config)
    console.error(`routes`, getSortedRoutes())
    return
  }

  setLoadingState('loading')
  console.log('[one] 🚀 Preloading route...')

  // Preload route modules first so loadRoute() won't throw Suspense promises
  await preloadRoute(href, true)
  console.log('[one] 🚀 Preload complete')

  // Run async route validation before navigation
  const matchingRouteNode = findRouteNodeFromState(state, routeNode)
  if (matchingRouteNode?.loadRoute) {
    setValidationState({ status: 'validating', lastValidatedHref: href })

    try {
      const loadedRoute = matchingRouteNode.loadRoute()
      const params = extractParamsFromState(state)
      const search = extractSearchFromHref(href)
      const pathname = extractPathnameFromHref(href)

      // Run validateParams if exported
      if (loadedRoute.validateParams) {
        runValidateParams(loadedRoute.validateParams, params)
      }

      // Run validateRoute if exported
      if (loadedRoute.validateRoute) {
        const validationResult = await loadedRoute.validateRoute({
          params,
          search,
          pathname,
          href,
        })

        // Check for explicit invalid result
        if (validationResult && !validationResult.valid) {
          const error = new RouteValidationError(
            validationResult.error || 'Route validation failed',
            validationResult.details
          )
          setValidationState({ status: 'error', error, lastValidatedHref: href })
          throw error
        }
      }

      setValidationState({ status: 'valid', lastValidatedHref: href })
    } catch (error) {
      // Handle Suspense promises thrown by loadRoute in dev mode
      if (error && typeof (error as any).then === 'function') {
        // Wait for the route to load and skip validation for this navigation
        await (error as Promise<any>).catch(() => {})
        setValidationState({ status: 'valid', lastValidatedHref: href })
      } else if (
        error instanceof ParamValidationError ||
        error instanceof RouteValidationError
      ) {
        setValidationState({ status: 'error', error, lastValidatedHref: href })
        throw error
      } else {
        // Re-throw other errors
        throw error
      }
    }
  }

  // Update client matches for useMatches hook
  // On web: runs after preload so loaderData is available
  // On native: runs without preloaded data (loaders are fetched by useLoader)
  const normalizedPath = normalizeLoaderPath(href)
  const loaderData = preloadedLoaderData[normalizedPath]
  const params = extractParamsFromState(state)
  const newMatches = buildClientMatches(href, matchingRouteNode, params, loaderData)
  currentMatches = newMatches
  setClientMatches(newMatches)

  const rootState = navigationRef.getRootState()

  const hash = href.indexOf('#')
  if (rootState.key && hash > 0) {
    hashes[rootState.key] = href.slice(hash)
  }

  // a bit hacky until can figure out a reliable way to tie it to the state
  nextOptions = options ?? null

  console.log('[one] 🚀 Dispatching navigation action')
  startTransition(() => {
    const action = getNavigateAction(state, rootState, event)
    console.log('[one] 🚀 Navigation action:', action?.type, action)
    const current = navigationRef.getCurrentRoute()
    console.log('[one] 🚀 Current route before dispatch:', current?.name)
    navigationRef.dispatch(action)
    console.log('[one] 🚀 Dispatch called')

    let warningTm
    const interval = setInterval(() => {
      const next = navigationRef.getCurrentRoute()
      console.log('[one] 🚀 Route check - current:', current?.name, 'next:', next?.name)
      if (current !== next) {
        console.log('[one] ✅ Navigation completed!')
        // let the main thread clear at least before running
        setTimeout(() => {
          setLoadingState('loaded')
        })
      }
      clearTimeout(warningTm)
      clearTimeout(interval)
    }, 16)
    if (process.env.NODE_ENV === 'development') {
      warningTm = setTimeout(() => {
        console.warn(`Routing took more than 8 seconds`)
      }, 1000)
    }
  })

  return
}

const hashes: Record<string, string> = {}

let nextOptions: OneRouter.LinkToOptions | null = null

function deepEqual(a: any, b: any) {
  if (a === b) {
    return true
  }

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) {
      return false
    }

    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) {
        return false
      }
    }

    return true
  }

  if (typeof a === 'object' && typeof b === 'object') {
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)

    if (keysA.length !== keysB.length) {
      return false
    }

    for (const key of keysA) {
      if (!deepEqual(a[key], b[key])) {
        return false
      }
    }

    return true
  }

  return false
}
