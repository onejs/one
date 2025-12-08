/**
 * Note: this entire module is exported as an interface router.*
 * We need to treat exports as an API and not change them, maybe not
 * the best decision.
 */

import { type NavigationContainerRefWithCurrent, StackActions } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import {
  type ComponentType,
  Fragment,
  startTransition,
  useDeferredValue,
  useSyncExternalStore,
} from 'react'
import { Platform } from 'react-native'
import type { OneRouter } from '../interfaces/router'
import { resolveHref } from '../link/href'
import { resolve } from '../link/path'
import { assertIsReady } from '../utils/assertIsReady'
import { getLoaderPath, getPreloadPath } from '../utils/cleanUrl'
import { dynamicImport } from '../utils/dynamicImport'
import { shouldLinkExternally } from '../utils/url'
import type { One } from '../vite/types'
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

// Module-scoped variables
export let routeNode: RouteNode | null = null
export let rootComponent: ComponentType

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

      const dynamicBadge = node.dynamic ? ` [${node.dynamic.map((d) => d.name).join(', ')}]` : ''
      const typeBadge = node.type !== 'layout' ? ` (${node.type})` : ''
      const routeName = node.route || '/'

      let line = `${prefix}${routeName}${dynamicBadge}${typeBadge}`

      const visibleChildren = node.children.filter((child) => !child.internal)
      for (let i = 0; i < visibleChildren.length; i++) {
        const child = visibleChildren[i]
        const childIsLast = i === visibleChildren.length - 1
        line += '\n' + formatRouteTree(child, childIndent, childIsLast)
      }

      return line
    }

    console.info(`[one] 📍 Route structure:\n${formatRouteTree(routeNode)}`)
  }

  navigationRef = ref
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
  const state = useSyncExternalStore(subscribeToRootState, rootStateSnapshot, rootStateSnapshot)
  return useDeferredValue(state)
}

export function useStoreRouteInfo() {
  syncStoreRootState()
  const state = useSyncExternalStore(subscribeToRootState, routeInfoSnapshot, routeInfoSnapshot)
  return useDeferredValue(state)
}

// Cleanup function
export function cleanup() {
  if (splashScreenAnimationFrame) {
    cancelAnimationFrame(splashScreenAnimationFrame)
  }
}

// TODO
export const preloadingLoader: Record<string, Promise<any> | undefined> = {}

async function doPreload(href: string) {
  const preloadPath = getPreloadPath(href)
  const loaderPath = getLoaderPath(href)
  try {
    const [_preload, loader] = await Promise.all([
      dynamicImport(preloadPath),
      dynamicImport(loaderPath),
      preloadRouteModules(href),
    ])

    if (!loader?.loader) {
      return null
    }

    const result = await loader.loader()
    return result ?? null
  } catch (err) {
    console.error(`[one] preload error for ${href}:`, err)
    return null
  }
}

// Store resolved preload data separately from promises
export const preloadedLoaderData: Record<string, any> = {}

export function preloadRoute(href: string): Promise<any> | undefined {
  if (process.env.TAMAGUI_TARGET === 'native') {
    return
  }
  if (process.env.NODE_ENV === 'development') {
    return
  }

  if (!preloadingLoader[href]) {
    preloadingLoader[href] = doPreload(href).then((data) => {
      // Store the resolved data for synchronous access
      preloadedLoaderData[href] = data
      return data
    })
  }
  return preloadingLoader[href]
}

export async function linkTo(href: string, event?: string, options?: OneRouter.LinkToOptions) {
  if (process.env.ONE_DEBUG_ROUTER) {
    console.info(`[one] 🔗 ${event || 'NAVIGATE'} ${href}`)
  }

  if (href[0] === '#') {
    // this is just linking to a section of the current page on web
    return
  }

  if (shouldLinkExternally(href)) {
    Linking.openURL(href)
    return
  }

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
  }

  const state = linking.getStateFromPath!(href, linking.config)

  if (!state || state.routes.length === 0) {
    console.error('Could not generate a valid navigation state for the given path: ' + href)
    console.error(`linking.config`, linking.config)
    console.error(`routes`, getSortedRoutes())
    return
  }

  setLoadingState('loading')

  // await preload on web to ensure route modules are loaded before navigating
  await preloadRoute(href)

  const rootState = navigationRef.getRootState()

  const hash = href.indexOf('#')
  if (rootState.key && hash > 0) {
    hashes[rootState.key] = href.slice(hash)
  }

  // a bit hacky until can figure out a reliable way to tie it to the state
  nextOptions = options ?? null

  startTransition(() => {
    const action = getNavigateAction(state, rootState, event)
    const current = navigationRef.getCurrentRoute()
    navigationRef.dispatch(action)

    let warningTm
    const interval = setInterval(() => {
      const next = navigationRef.getCurrentRoute()
      if (current !== next) {
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
