import {
  StackActions,
  type NavigationContainerRefWithCurrent,
  type getPathFromState as originalGetPathFromState,
} from '@react-navigation/native'
import { Fragment, useSyncExternalStore, type ComponentType } from 'react'
import { Platform } from 'react-native'
import type { RouteNode } from '../Route'
import type { State } from '../fork/getPathFromState'
import { deepEqual, getPathDataFromState } from '../fork/getPathFromState'
import type { ResultState } from '../fork/getStateFromPath'
import { stripBaseUrl } from '../fork/getStateFromPath'
import { getLinkingConfig, type ExpoLinkingOptions } from '../getLinkingConfig'
import { getRoutes } from '../getRoutes'
import type { VXSRouter } from '../interfaces/router'
import { resolveHref } from '../link/href'
import { sortRoutes } from '../sortRoutes'
import type { RequireContext } from '../types'
import { getQualifiedRouteComponent } from '../useScreens'
import { assertIsReady } from '../utils/assertIsReady'
import { getNormalizedStatePath, type UrlObject } from './getNormalizedStatePath'

// Module-scoped variables
export let routeNode: RouteNode | null = null
export let rootComponent: ComponentType
export let linking: ExpoLinkingOptions | undefined

export let hasAttemptedToHideSplash = false
export let initialState: ResultState | undefined
export let rootState: ResultState | undefined

let nextState: ResultState | undefined
export let routeInfo: UrlObject | undefined
let splashScreenAnimationFrame: number | undefined

// we always set it
export let navigationRef: VXSRouter.NavigationRef = null as any
let navigationRefSubscription: () => void

let rootStateSubscribers = new Set<() => void>()
let storeSubscribers = new Set<() => void>()

// Initialize function
export function initialize(
  context: RequireContext,
  ref: NavigationContainerRefWithCurrent<ReactNavigation.RootParamList>,
  initialLocation?: URL
) {
  cleanUpState()
  routeNode = getRoutes(context, { ignoreEntryPoints: true, platform: Platform.OS })
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
    const state = data.data.state as ResultState

    if (!hasAttemptedToHideSplash) {
      hasAttemptedToHideSplash = true
      splashScreenAnimationFrame = requestAnimationFrame(() => {
        // SplashScreen._internal_maybeHideAsync?.();
      })
    }

    let shouldUpdateSubscribers = nextState === state
    nextState = undefined

    if (state && state !== rootState) {
      updateState(state, undefined)
      shouldUpdateSubscribers = true
    }

    if (shouldUpdateSubscribers) {
      for (const subscriber of rootStateSubscribers) {
        subscriber()
      }
    }
  })

  updateSnapshot()
  for (const subscriber of storeSubscribers) {
    subscriber()
  }
}

// Navigation functions
export function navigate(url: VXSRouter.Href) {
  return linkTo(resolveHref(url), 'NAVIGATE')
}

export function push(url: VXSRouter.Href) {
  return linkTo(resolveHref(url), 'PUSH')
}

export function dismiss(count?: number) {
  navigationRef?.dispatch(StackActions.pop(count))
}

export function replace(url: VXSRouter.Href) {
  return linkTo(resolveHref(url), 'REPLACE')
}

export function setParams(params: Record<string, string | number> = {}) {
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

export function updateState(state: ResultState, nextStateParam = state) {
  rootState = state
  nextState = nextStateParam

  const nextRouteInfo = getRouteInfo(state)

  if (!deepEqual(routeInfo, nextRouteInfo)) {
    routeInfo = nextRouteInfo
  }
}

export function getRouteInfo(state: ResultState) {
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
export function subscribeToRootState(subscriber: () => void) {
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
export function useVXSRouter() {
  return useSyncExternalStore(subscribeToStore, snapshot, snapshot)
}

function syncStoreRootState() {
  if (navigationRef.isReady()) {
    const currentState = navigationRef.getRootState() as unknown as ResultState
    console.log('currentState', currentState)

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

import type { NavigationState, PartialRoute } from '@react-navigation/native'
import * as Linking from 'expo-linking'
import { nanoid } from 'nanoid/non-secure'
import { startTransition } from 'react'
import { resolve } from '../link/path'
import { matchDynamicName } from '../matchers'
import { shouldLinkExternally } from '../utils/url'
import { CLIENT_BASE_URL } from './constants'

// TODO
export const preloadingLoader = {}

function setupPreload(href: string) {
  if (preloadingLoader[href]) return
  preloadingLoader[href] = async () => {
    const loaderJSUrl = `${CLIENT_BASE_URL}/assets/${href
      .slice(1)
      .replaceAll('/', '_')}_vxrn_loader.js`
    const response = await import(loaderJSUrl)
    try {
      return await response.loader()
    } catch (err) {
      console.error(`Error preloading loader: ${err}`)
      return null
    }
  }
}

export function preloadRoute(href: string) {
  if (import.meta.env.PROD) {
    setupPreload(href)
    if (typeof preloadingLoader[href] === 'function') {
      void preloadingLoader[href]()
    }
  }
}

export function linkTo(href: string, event?: string) {
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

  // todo
  globalThis['__vxrntodopath'] = href

  preloadRoute(href)

  const state = linking.getStateFromPath!(href, linking.config)

  if (!state || state.routes.length === 0) {
    console.error('Could not generate a valid navigation state for the given path: ' + href)
    console.error(`linking.config`, linking.config)
    console.error(`routes`, getSortedRoutes())
    return
  }

  const rootState = navigationRef.getRootState()
  const action = getNavigateAction(state, rootState, event)

  startTransition(() => {
    const current = navigationRef.getCurrentRoute()

    // loading state
    send('start')
    navigationRef.dispatch(action)
    let warningTm
    const interval = setInterval(() => {
      const next = navigationRef.getCurrentRoute()
      if (current !== next) {
        send('finish')
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

type LoadState = 'start' | 'finish'
type LoadStateListener = (type: LoadState) => void

function send(event: LoadState) {
  linkEventListeners.forEach((l) => l(event))
}

const linkEventListeners = new Set<LoadStateListener>()
export function onLoadingState(l: LoadStateListener) {
  linkEventListeners.add(l)
  return () => {
    linkEventListeners.delete(l)
  }
}

function getNavigateAction(
  actionState: ResultState,
  navigationState: NavigationState,
  type = 'NAVIGATE'
) {
  /**
   * We need to find the deepest navigator where the action and current state diverge, If they do not diverge, the
   * lowest navigator is the target.
   *
   * By default React Navigation will target the current navigator, but this doesn't work for all actions
   * For example:
   *  - /deeply/nested/route -> /top-level-route the target needs to be the top-level navigator
   *  - /stack/nestedStack/page -> /stack1/nestedStack/other-page needs to target the nestedStack navigator
   *
   * This matching needs to done by comparing the route names and the dynamic path, for example
   * - /1/page -> /2/anotherPage needs to target the /[id] navigator
   *
   * Other parameters such as search params and hash are not evaluated.
   *
   */
  let actionStateRoute: PartialRoute<any> | undefined

  // Traverse the state tree comparing the current state and the action state until we find where they diverge
  while (actionState && navigationState) {
    const stateRoute = navigationState.routes[navigationState.index]

    actionStateRoute = actionState.routes[actionState.routes.length - 1]

    const childState = actionStateRoute.state
    const nextNavigationState = stateRoute.state

    const dynamicName = matchDynamicName(actionStateRoute.name)

    const didActionAndCurrentStateDiverge =
      actionStateRoute.name !== stateRoute.name ||
      !childState ||
      !nextNavigationState ||
      (dynamicName && actionStateRoute.params?.[dynamicName] !== stateRoute.params?.[dynamicName])

    if (didActionAndCurrentStateDiverge) {
      break
    }

    actionState = childState
    navigationState = nextNavigationState as NavigationState
  }

  /*
   * We found the target navigator, but the payload is in the incorrect format
   * We need to convert the action state to a payload that can be dispatched
   */
  const rootPayload: Record<string, any> = { params: {} }
  let payload = rootPayload
  let params = payload.params

  // The root level of payload is a bit weird, its params are in the child object
  while (actionStateRoute) {
    Object.assign(params, { ...actionStateRoute.params })
    payload.screen = actionStateRoute.name

    actionStateRoute = actionStateRoute.state?.routes[actionStateRoute.state?.routes.length - 1]

    payload.params ??= {}
    payload = payload.params
    params = payload
  }

  // Expo Router uses only three actions, but these don't directly translate to all navigator actions
  if (type === 'PUSH') {
    // Only stack navigators have a push action, and even then we want to use NAVIGATE (see below)
    type = 'NAVIGATE'

    /*
     * The StackAction.PUSH does not work correctly with Expo Router.
     *
     * Expo Router provides a getId() function for every route, altering how React Navigation handles stack routing.
     * Ordinarily, PUSH always adds a new screen to the stack. However, with getId() present, it navigates to the screen with the matching ID instead (by moving the screen to the top of the stack)
     * When you try and push to a screen with the same ID, no navigation will occur
     * Refer to: https://github.com/react-navigation/react-navigation/blob/13d4aa270b301faf07960b4cd861ffc91e9b2c46/packages/routers/src/StackRouter.tsx#L279-L290
     *
     * Expo Router needs to retain the default behavior of PUSH, consistently adding new screens to the stack, even if their IDs are identical.
     *
     * To resolve this issue, we switch to using a NAVIGATE action with a new key. In the navigate action, screens are matched by either key or getId() function.
     * By generating a unique new key, we ensure that the screen is always pushed onto the stack.
     *
     */
    if (navigationState.type === 'stack') {
      rootPayload.key = `${rootPayload.name}-${nanoid()}` // @see https://github.com/react-navigation/react-navigation/blob/13d4aa270b301faf07960b4cd861ffc91e9b2c46/packages/routers/src/StackRouter.tsx#L406-L407
    }
  }

  if (type === 'REPLACE' && navigationState.type === 'tab') {
    type = 'JUMP_TO'
  }

  return {
    type,
    target: navigationState.key,
    payload: {
      key: rootPayload.key,
      name: rootPayload.screen,
      params: rootPayload.params,
    },
  }
}
