import {
  StackActions,
  type NavigationContainerRefWithCurrent,
  type getPathFromState as originalGetPathFromState,
} from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { Fragment, startTransition, type ComponentType, useSyncExternalStore } from 'react'
import { Platform } from 'react-native'
import type { State } from '../fork/getPathFromState'
import { getPathDataFromState } from '../fork/getPathFromState'
import { stripBaseUrl } from '../fork/getStateFromPath-mods'
import type { OneRouter } from '../interfaces/router'
import { resolveHref } from '../link/href'
import { resolve } from '../link/path'
import { assertIsReady } from '../utils/assertIsReady'
import { getLoaderPath, getPreloadPath } from '../utils/cleanUrl'
import { dynamicImport } from '../utils/dynamicImport'
import { shouldLinkExternally } from '../utils/url'
import type { One } from '../vite/types'
import { getLinkingConfig, type OneLinkingOptions } from './getLinkingConfig'
import { getNormalizedStatePath, type UrlObject } from './getNormalizedStatePath'
import { getRoutes } from './getRoutes'
import { setLastAction } from './lastAction'
import type { RouteNode } from './Route'
import { sortRoutes } from './sortRoutes'
import { getQualifiedRouteComponent } from './useScreens'
import { getNavigateAction } from './utils/getNavigateAction'

// Module-scoped variables
export let routeNode: RouteNode | null = null
export let rootComponent: ComponentType
export let linking: OneLinkingOptions | undefined

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

  navigationRef = ref
  setupLinking(initialLocation)
  subscribeToNavigationChanges()
}

function cleanUpState() {
  initialState = undefined
  rootState = undefined
  nextState = undefined
  routeInfo = undefined
  linking = undefined
  navigationRefSubscription?.()
  rootStateSubscribers.clear()
  storeSubscribers.clear()
}

function setupLinking(initialLocation?: URL) {
  if (routeNode) {
    linking = getLinkingConfig(routeNode)

    if (initialLocation) {
      linking.getInitialURL = () => initialLocation.toString()
      initialState = linking.getStateFromPath?.(
        initialLocation.pathname + (initialLocation.search || ''),
        linking.config
      )
    }
  }

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
  navigationRef?.dispatch(StackActions.popToTop())
}

export function goBack() {
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
    routeInfo = nextRouteInfo
  }
}

export function getRouteInfo(state: OneRouter.ResultState) {
  return getRouteInfoFromState(
    (state: Parameters<typeof originalGetPathFromState>[0], asPath: boolean) => {
      return getPathDataFromState(state, {
        screens: [],
        ...linking?.config,
        preserveDynamicRoutes: asPath,
        preserveGroups: asPath,
      })
    },
    state
  )
}

function getRouteInfoFromState(
  getPathFromState: (state: State, asPath: boolean) => { path: string; params: any },
  state: State,
  baseUrl?: string
): UrlObject {
  const { path } = getPathFromState(state, false)
  const qualified = getPathFromState(state, true)

  return {
    unstable_globalHref: path,
    pathname: stripBaseUrl(path, baseUrl).split('?')[0],
    isIndex: isIndexPath(state),
    ...getNormalizedStatePath(qualified, baseUrl),
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
    linking,
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
  return useSyncExternalStore(subscribeToStore, snapshot, snapshot)
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
  return useSyncExternalStore(subscribeToRootState, rootStateSnapshot, rootStateSnapshot)
}

export function useStoreRouteInfo() {
  syncStoreRootState()
  return useSyncExternalStore(subscribeToRootState, routeInfoSnapshot, routeInfoSnapshot)
}

// Utility functions
function isIndexPath(state: State) {
  const route = getActualLastRoute(state.routes[state.index ?? state.routes.length - 1])

  if (route.state) {
    return isIndexPath(route.state)
  }

  if (route.name === 'index') {
    return true
  }

  if (route.params && 'screen' in route.params) {
    return route.params.screen === 'index'
  }

  if (route.name.match(/.+\/index$/)) {
    return true
  }

  return false
}

type RouteLikeTree = { name: string; state?: { routes?: RouteLikeTree[] } }

function getActualLastRoute<A extends RouteLikeTree>(routeLike: A): A {
  if (routeLike.name[0] === '(' && routeLike.state?.routes) {
    const routes = routeLike.state.routes
    return getActualLastRoute(routes[routes.length - 1]) as any
  }
  return routeLike
}

// Cleanup function
export function cleanup() {
  if (splashScreenAnimationFrame) {
    cancelAnimationFrame(splashScreenAnimationFrame)
  }
}

// TODO
export const preloadingLoader = {}

function setupPreload(href: string) {
  if (preloadingLoader[href]) return
  preloadingLoader[href] = async () => {
    try {
      const [_preload, loader] = await Promise.all([
        dynamicImport(getPreloadPath(href)),
        dynamicImport(getLoaderPath(href)),
      ])
      const response = await loader
      return await response.loader?.()
    } catch (err) {
      console.error(`Error preloading loader: ${err}`)
      return null
    }
  }
}

export function preloadRoute(href: string) {
  if (process.env.TAMAGUI_TARGET === 'native') {
    // not enabled for now
    return
  }
  if (process.env.NODE_ENV === 'development') {
    return
  }

  setupPreload(href)
  if (typeof preloadingLoader[href] === 'function') {
    void preloadingLoader[href]()
  }
}

export async function linkTo(href: string, event?: string, options?: OneRouter.LinkToOptions) {
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

  preloadRoute(href)

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
