/**
 * This file is copied from the react-navigation repo:
 * https://github.com/react-navigation/react-navigation/blob/%40react-navigation/core%407.1.2/packages/native/src/useLinking.tsx
 *
 * Please refrain from making changes to this file, as it will make merging updates from the upstream harder.
 * All modifications except formatting should be marked with `// @modified` comment.
 */

import {
  findFocusedRoute,
  getActionFromState as getActionFromStateDefault,
  getPathFromState as getPathFromStateDefault,
  getStateFromPath as getStateFromPathDefault,
  type NavigationContainerRef,
  type NavigationState,
  type ParamListBase,
  useNavigationIndependentTree,
} from '@react-navigation/core'
// @modified - end
import type { LinkingOptions } from '@react-navigation/native' // @modified: change import path
import isEqual from 'fast-deep-equal'
import * as React from 'react'
// @modified - start
// import { ServerContext } from '@react-navigation/web';
import { rootState as routerRootState } from '../router/router'
import { stripGroupSegmentsFromPath } from '../router/matchers'
import { ServerLocationContext } from '../router/serverLocationContext'
import { createMemoryHistory } from './createMemoryHistory'
import { appendBaseUrl } from './getPathFromState-mods'

type ResultState = ReturnType<typeof getStateFromPathDefault>

/**
 * Find the matching navigation state that changed between 2 navigation states
 * e.g.: a -> b -> c -> d and a -> b -> c -> e -> f, if history in b changed, b is the matching state
 */
const findMatchingState = <T extends NavigationState>(
  a: T | undefined,
  b: T | undefined
): [T | undefined, T | undefined] => {
  if (a === undefined || b === undefined || a.key !== b.key) {
    return [undefined, undefined]
  }

  // Tab and drawer will have `history` property, but stack will have history in `routes`
  const aHistoryLength = a.history ? a.history.length : a.routes.length
  const bHistoryLength = b.history ? b.history.length : b.routes.length

  const aRoute = a.routes[a.index]
  const bRoute = b.routes[b.index]

  const aChildState = aRoute.state as T | undefined
  const bChildState = bRoute.state as T | undefined

  // Stop here if this is the state object that changed:
  // - history length is different
  // - focused routes are different
  // - one of them doesn't have child state
  // - child state keys are different
  if (
    aHistoryLength !== bHistoryLength ||
    aRoute.key !== bRoute.key ||
    aChildState === undefined ||
    bChildState === undefined ||
    aChildState.key !== bChildState.key
  ) {
    return [a, b]
  }

  return findMatchingState(aChildState, bChildState)
}

/**
 * Run async function in series as it's called.
 */
export const series = (cb: () => Promise<void>) => {
  let queue = Promise.resolve()
  const callback = () => {
    // eslint-disable-next-line promise/no-callback-in-promise
    queue = queue.then(cb)
  }
  return callback
}

const linkingHandlers: symbol[] = []

type Options = LinkingOptions<ParamListBase>

export function useLinking(
  ref: React.RefObject<NavigationContainerRef<ParamListBase> | null>,
  {
    enabled = true,
    config,
    getStateFromPath = getStateFromPathDefault,
    getPathFromState = getPathFromStateDefault,
    getActionFromState = getActionFromStateDefault,
  }: Options,
  onUnhandledLinking: (lastUnhandledLining: string | undefined) => void
) {
  const independent = useNavigationIndependentTree()

  React.useEffect(() => {
    if (process.env.NODE_ENV === 'production') {
      return undefined
    }

    if (independent) {
      return undefined
    }

    if (enabled !== false && linkingHandlers.length) {
      console.error(
        [
          'Looks like you have configured linking in multiple places. This is likely an error since deep links should only be handled in one place to avoid conflicts. Make sure that:',
          "- You don't have multiple NavigationContainers in the app each with 'linking' enabled",
          '- Only a single instance of the root component is rendered',
        ]
          .join('\n')
          .trim()
      )
    }

    const handler = Symbol()

    if (enabled !== false) {
      linkingHandlers.push(handler)
    }

    return () => {
      const index = linkingHandlers.indexOf(handler)

      if (index > -1) {
        linkingHandlers.splice(index, 1)
      }
    }
  }, [enabled, independent])

  const [history] = React.useState(createMemoryHistory)

  // We store these options in ref to avoid re-creating getInitialState and re-subscribing listeners
  // This lets user avoid wrapping the items in `React.useCallback` or `React.useMemo`
  // Not re-creating `getInitialState` is important coz it makes it easier for the user to use in an effect
  const enabledRef = React.useRef(enabled)
  const configRef = React.useRef(config)
  const getStateFromPathRef = React.useRef(getStateFromPath)
  const getPathFromStateRef = React.useRef(getPathFromState)
  const getActionFromStateRef = React.useRef(getActionFromState)

  React.useEffect(() => {
    enabledRef.current = enabled
    configRef.current = config
    getStateFromPathRef.current = getStateFromPath
    getPathFromStateRef.current = getPathFromState
    getActionFromStateRef.current = getActionFromState
  })

  const validateRoutesNotExistInRootState = React.useCallback(
    (state: ResultState) => {
      const navigation = ref.current
      const rootState = navigation?.getRootState()
      // @modified - start
      // Fix for back/forward button navigation: if routeNames is undefined (stale state),
      // don't reject the navigation. This can happen during browser back/forward.
      // See: https://github.com/expo/expo/pull/37747
      const routeNames = rootState?.routeNames
      if (!routeNames) {
        return false // Don't reject navigation if we can't validate
      }
      // @modified - end
      // Make sure that the routes in the state exist in the root navigator
      // Otherwise there's an error in the linking configuration
      return state?.routes.some((r) => !routeNames.includes(r.name))
    },
    [ref]
  )

  // @modified - start
  // ServerContext is used inside ServerContainer to set the location during SSR: https://github.com/react-navigation/react-navigation/blob/13d4aa270b301faf07960b4cd861ffc91e9b2c46/packages/native/src/ServerContainer.tsx#L50-L54
  // One uses the `initialLocation` prop to set the initial location during SSR:
  // const server = React.useContext(ServerContext)
  const location = React.useContext(ServerLocationContext)
  const server = { location }
  // @modified - end

  const getInitialState = React.useCallback(() => {
    let value: ResultState | undefined

    if (enabledRef.current) {
      const location =
        server?.location ?? (typeof window !== 'undefined' ? window.location : undefined)

      const path = location ? location.pathname + location.search : undefined

      if (process.env.ONE_DEBUG_ROUTER) {
        console.info(`[one] 🔍 getInitialState path=${path}`)
      }

      if (path) {
        value = getStateFromPathRef.current(path, configRef.current)
        if (process.env.ONE_DEBUG_ROUTER) {
          console.info(`[one] 🔍 getInitialState result:`, JSON.stringify(value, null, 2))
        }
      }

      // If the link were handled, it gets cleared in NavigationContainer
      onUnhandledLinking(path)
    }

    const thenable = {
      // biome-ignore lint/suspicious/noThenProperty: don't check copied code
      then(onfulfilled?: (state: ResultState | undefined) => void) {
        return Promise.resolve(onfulfilled ? onfulfilled(value) : value)
      },
      catch() {
        return thenable
      },
    }

    return thenable as PromiseLike<ResultState | undefined>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const previousIndexRef = React.useRef<number | undefined>(undefined)
  const previousStateRef = React.useRef<NavigationState | undefined>(undefined)
  const pendingPopStatePathRef = React.useRef<string | undefined>(undefined)

  React.useEffect(() => {
    previousIndexRef.current = history.index

    return history.listen(() => {
      const navigation = ref.current

      if (!navigation || !enabled) {
        return
      }

      const { location } = window

      const path = location.pathname + location.search
      const index = history.index

      const previousIndex = previousIndexRef.current ?? 0

      if (process.env.ONE_DEBUG_ROUTER) {
        console.info(
          `[one] 📜 history.listen path=${path} index=${index} prevIndex=${previousIndex}`
        )
      }

      previousIndexRef.current = index
      pendingPopStatePathRef.current = path

      // When browser back/forward is clicked, we first need to check if state object for this index exists
      // If it does we'll reset to that state object
      // Otherwise, we'll handle it like a regular deep link
      const record = history.get(index)

      // @modified - check both actual path and display path for route masking support
      const pathMatches = record?.path === path || record?.displayPath === path
      if (pathMatches && record?.state) {
        if (process.env.ONE_DEBUG_ROUTER) {
          console.info(`[one] 📜 history record found, resetRoot to:`, record.state)
        }
        navigation.resetRoot(record.state)
        return
      }

      const state = getStateFromPathRef.current(path, configRef.current)

      if (process.env.ONE_DEBUG_ROUTER) {
        console.info(`[one] 📜 getStateFromPath result:`, state)
      }

      // We should only dispatch an action when going forward
      // Otherwise the action will likely add items to history, which would mess things up
      if (state) {
        // If the link were handled, it gets cleared in NavigationContainer
        onUnhandledLinking(path)
        // Make sure that the routes in the state exist in the root navigator
        // Otherwise there's an error in the linking configuration
        if (validateRoutesNotExistInRootState(state)) {
          if (process.env.ONE_DEBUG_ROUTER) {
            console.info(`[one] 📜 routes not in root state, skipping`)
          }
          return
        }

        // @modified: workaround to make react-navigation handle hash changes
        if (
          index > previousIndex ||
          (index === previousIndex &&
            (!record || `${record?.path}${location.hash}` === path))
        ) {
          const action = getActionFromStateRef.current(state, configRef.current)

          if (process.env.ONE_DEBUG_ROUTER) {
            console.info(`[one] 📜 dispatching action:`, action)
          }

          if (action !== undefined) {
            try {
              navigation.dispatch(action)
            } catch (e) {
              // Ignore any errors from deep linking.
              // This could happen in case of malformed links, navigation object not being initialized etc.
              console.warn(
                `An error occurred when trying to handle the link '${path}': ${
                  typeof e === 'object' && e != null && 'message' in e ? e.message : e
                }`
              )
            }
          } else {
            if (process.env.ONE_DEBUG_ROUTER) {
              console.info(`[one] 📜 no action, resetRoot`)
            }
            navigation.resetRoot(state)
          }
        } else {
          if (process.env.ONE_DEBUG_ROUTER) {
            console.info(`[one] 📜 going back, resetRoot`)
          }
          navigation.resetRoot(state)
        }
      } else {
        // if current path didn't return any state, we should revert to initial state
        if (process.env.ONE_DEBUG_ROUTER) {
          console.info(`[one] 📜 no state for path, resetRoot to undefined`)
        }
        navigation.resetRoot(state)
      }
    })
  }, [enabled, history, onUnhandledLinking, ref, validateRoutesNotExistInRootState])

  React.useEffect(() => {
    if (!enabled) {
      return
    }

    const getPathForRoute = (
      route: ReturnType<typeof findFocusedRoute>,
      state: NavigationState
    ): string => {
      let path

      if (process.env.ONE_DEBUG_ROUTER) {
        console.info(`[one] 📜 getPathForRoute - route:`, route)
        console.info(`[one] 📜 getPathForRoute - state:`, JSON.stringify(state, null, 2))
      }

      // If the `route` object contains a `path`, use that path as long as `route.name` and `params` still match
      // This makes sure that we preserve the original URL for wildcard routes
      if (route?.path) {
        const stateForPath = getStateFromPathRef.current(route.path, configRef.current)

        if (stateForPath) {
          const focusedRoute = findFocusedRoute(stateForPath)

          if (
            focusedRoute &&
            focusedRoute.name === route.name &&
            isEqual(focusedRoute.params, route.params)
          ) {
            // @modified - start
            // path = route.path
            path = appendBaseUrl(route.path)
            // @modified - end
          }
        }
      }

      if (path == null) {
        path = getPathFromStateRef.current(state, configRef.current)
        if (process.env.ONE_DEBUG_ROUTER) {
          console.info(`[one] 📜 getPathForRoute - computed from state:`, path)
        }
      }

      // @modified - start: One will handle hashes itself, so these lines are not needed
      // const previousRoute = previousStateRef.current
      //   ? findFocusedRoute(previousStateRef.current)
      //   : undefined

      // // Preserve the hash if the route didn't change
      // if (
      //   previousRoute &&
      //   route &&
      //   'key' in previousRoute &&
      //   'key' in route &&
      //   previousRoute.key === route.key
      // ) {
      //   path = path + location.hash
      // }
      // @modified - end

      return path
    }

    if (ref.current) {
      // We need to record the current metadata on the first render if they aren't set
      // This will allow the initial state to be in the history entry
      // @modified - start: Use routerRootState instead of getRootState() to avoid stale state
      // getRootState() can return incomplete state during initial render before children mount
      // routerRootState is updated via navigation listener callbacks which only fire with complete state
      const refState = ref.current.getRootState()
      const state = (routerRootState || refState) as NavigationState | undefined

      if (process.env.ONE_DEBUG_ROUTER) {
        console.info(
          `[one] 📜 useEffect initial state check - refState:`,
          JSON.stringify(refState, null, 2)
        )
        console.info(
          `[one] 📜 useEffect initial state check - routerRootState:`,
          JSON.stringify(routerRootState, null, 2)
        )
      }
      // @modified - end

      if (state) {
        const route = findFocusedRoute(state)

        if (process.env.ONE_DEBUG_ROUTER) {
          console.info(`[one] 📜 useEffect focused route:`, route)
        }

        const path = getPathForRoute(route, state)

        if (process.env.ONE_DEBUG_ROUTER) {
          console.info(
            `[one] 📜 initial history.replace - state:`,
            JSON.stringify(state, null, 2)
          )
          console.info(`[one] 📜 initial history.replace - focusedRoute:`, route)
          console.info(`[one] 📜 initial history.replace - computed path:`, path)
        }

        if (previousStateRef.current === undefined) {
          previousStateRef.current = refState
        }

        history.replace({ path, state })
      }
    }

    const onStateChange = async () => {
      const navigation = ref.current

      if (!navigation || !enabled) {
        return
      }

      const previousState = previousStateRef.current
      // @modified - start: Use routerRootState for path calculation, refState for comparison
      const refState = navigation.getRootState()
      const state = (routerRootState || refState) as NavigationState | undefined
      // @modified - end

      // root state may not available, for example when root navigators switch inside the container
      if (!state) {
        return
      }

      const pendingPath = pendingPopStatePathRef.current
      const route = findFocusedRoute(state)
      const path = getPathForRoute(route, state)

      // @modified - extract mask from linkOptions for route masking
      const maskHref = (state as any).linkOptions?.mask?.href
      const displayPath = maskHref
        ? appendBaseUrl(stripGroupSegmentsFromPath(maskHref) || '/')
        : undefined

      previousStateRef.current = refState
      pendingPopStatePathRef.current = undefined

      // To detect the kind of state change, we need to:
      // - Find the common focused navigation state in previous and current state
      // - If only the route keys changed, compare history/routes.length to check if we go back/forward/replace
      // - If no common focused navigation state found, it's a replace
      const [previousFocusedState, focusedState] = findMatchingState(previousState, state)

      if (
        previousFocusedState &&
        focusedState &&
        // We should only handle push/pop if path changed from what was in last `popstate`
        // Otherwise it's likely a change triggered by `popstate`
        path !== pendingPath
      ) {
        const historyDelta =
          (focusedState.history
            ? focusedState.history.length
            : focusedState.routes.length) -
          (previousFocusedState.history
            ? previousFocusedState.history.length
            : previousFocusedState.routes.length)

        if (historyDelta > 0) {
          // If history length is increased, we should pushState
          // Note that path might not actually change here, for example, drawer open should pushState
          history.push({ path, state, displayPath })
        } else if (historyDelta < 0) {
          // If history length is decreased, i.e. entries were removed, we want to go back

          const nextIndex = history.backIndex({ path })
          const currentIndex = history.index

          try {
            if (
              nextIndex !== -1 &&
              nextIndex < currentIndex &&
              // We should only go back if the entry exists and it's less than current index
              history.get(nextIndex - currentIndex)
            ) {
              // An existing entry for this path exists and it's less than current index, go back to that
              await history.go(nextIndex - currentIndex)
            } else {
              // We couldn't find an existing entry to go back to, so we'll go back by the delta
              // This won't be correct if multiple routes were pushed in one go before
              // Usually this shouldn't happen and this is a fallback for that
              await history.go(historyDelta)
            }

            // Store the updated state as well as fix the path if incorrect
            // Don't apply mask when going back - use the actual path
            history.replace({ path, state })
          } catch (e) {
            // The navigation was interrupted
          }
        } else {
          // If history length is unchanged, we want to replaceState
          history.replace({ path, state, displayPath })
        }
      } else {
        // If no common navigation state was found, assume it's a replace
        // This would happen if the user did a reset/conditionally changed navigators
        history.replace({ path, state, displayPath })
      }
    }

    // We debounce onStateChange coz we don't want multiple state changes to be handled at one time
    // This could happen since `history.go(n)` is asynchronous
    // If `pushState` or `replaceState` were called before `history.go(n)` completes, it'll mess stuff up
    return ref.current?.addListener('state', series(onStateChange))
  }, [enabled, history, ref])

  return {
    getInitialState,
  }
}
