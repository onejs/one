import { useCallback, useSyncExternalStore } from 'react'
import { registerDevtoolsFunction } from './devtools/registry'
import { useParams, usePathname } from './hooks'
import { findNearestNotFoundRoute, setNotFoundState } from './notFoundState'
import { useContextKey } from './router/Route'
import { getContextKey } from './router/matchers'
import { router } from './router/imperative-api'
import { preloadedLoaderData, preloadingLoader, routeNode } from './router/router'
import { ssrLoaderData } from './server/ssrLoaderData'
import {
  subscribeToClientMatches,
  getClientMatchesSnapshot,
  updateMatchLoaderData,
} from './useMatches'
import { getLoaderPath } from './utils/cleanUrl'
import { getURL } from './getURL'
import { LOADER_JS_POSTFIX_UNCACHED } from './constants'
import { dynamicImport } from './utils/dynamicImport'
import { weakKey } from './utils/weakKey'
import { useServerContext } from './vite/one-server-only'

type LoaderStateEntry = {
  data: any
  error: any
  promise?: Promise<void>
  state: 'idle' | 'loading'
  timestamp?: number
  hasLoadedOnce?: boolean
}

// Timing data for loader waterfall devtool (dev only)
export type LoaderTimingEntry = {
  path: string
  startTime: number
  moduleLoadTime?: number
  executionTime?: number
  totalTime?: number
  error?: string
  source: 'preload' | 'initial' | 'refetch'
}

const LOADER_TIMEOUT = process.env.ONE_LOADER_TIMEOUT_MS
  ? +process.env.ONE_LOADER_TIMEOUT_MS
  : 60_000

// Store timing history for devtools - only populated in development
const loaderTimingHistory: LoaderTimingEntry[] = []
const MAX_TIMING_HISTORY = 50

const recordLoaderTiming =
  process.env.NODE_ENV === 'development'
    ? (entry: LoaderTimingEntry) => {
        loaderTimingHistory.unshift(entry)
        if (loaderTimingHistory.length > MAX_TIMING_HISTORY) {
          loaderTimingHistory.pop()
        }
        // Dispatch event for devtools (web only - CustomEvent doesn't exist on native)
        if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
          window.dispatchEvent(new CustomEvent('one-loader-timing', { detail: entry }))

          // Also dispatch error event if there was an error
          if (entry.error) {
            window.dispatchEvent(
              new CustomEvent('one-error', {
                detail: {
                  error: {
                    message: entry.error,
                    name: 'LoaderError',
                  },
                  route: {
                    pathname: entry.path,
                  },
                  timestamp: Date.now(),
                  type: 'loader',
                },
              })
            )
          }
        }
      }
    : undefined

export function getLoaderTimingHistory(): LoaderTimingEntry[] {
  return loaderTimingHistory
}

// Register with devtools registry so router.ts doesn't need to dynamically import us
registerDevtoolsFunction('getLoaderTimingHistory', getLoaderTimingHistory)
registerDevtoolsFunction('recordLoaderTiming', recordLoaderTiming)

const loaderState: Record<string, LoaderStateEntry> = {}
const subscribers = new Set<() => void>()

// Prevent unbounded growth of loaderState by pruning the oldest entry when
// we exceed this limit. Most apps navigate a limited set of routes, but
// dynamic params (e.g. /users/:id) can generate thousands of unique keys.
const LOADER_STATE_MAX = 200
const loaderStateKeys: string[] = []

function setBoundedLoaderState(path: string, entry: LoaderStateEntry) {
  if (!(path in loaderState)) {
    loaderStateKeys.push(path)
    if (loaderStateKeys.length > LOADER_STATE_MAX) {
      const oldest = loaderStateKeys.shift()!
      delete loaderState[oldest]
    }
  }
  loaderState[path] = entry
}

function updateState(path: string, updates: Partial<LoaderStateEntry>) {
  const merged = { ...loaderState[path], ...updates }
  setBoundedLoaderState(path, merged)
  subscribers.forEach((callback) => {
    callback()
  })
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function getLoaderState(path: string, preloadedData?: any): LoaderStateEntry {
  if (!(path in loaderState)) {
    const entry: LoaderStateEntry = {
      data: preloadedData,
      error: undefined,
      promise: undefined,
      state: 'idle',
      hasLoadedOnce: !!preloadedData,
    }
    setBoundedLoaderState(path, entry)
  }
  return loaderState[path]
}

/**
 * Imperatively refetch loader data for a given path.
 *
 * @param pathname - The route path to refetch (e.g., '/users/123')
 * @returns Promise that resolves when refetch completes
 * @link https://onestack.dev/docs/api/hooks/useLoaderState#refetchloader
 *
 * @example
 * ```tsx
 * await refetchLoader('/users/123')
 * ```
 */
export async function refetchLoader(pathname: string): Promise<void> {
  const startTime = performance.now()

  updateState(pathname, {
    state: 'loading',
    error: null,
  })

  try {
    const cacheBust = `${Date.now()}`
    const loaderJSUrl = getLoaderPath(pathname, true, cacheBust)

    const moduleLoadStart = performance.now()
    const module = await dynamicImport(loaderJSUrl)?.catch(() => null)
    const moduleLoadTime = performance.now() - moduleLoadStart

    // gracefully handle missing loader (404, no loader export, etc)
    if (!module?.loader) {
      updateState(pathname, {
        data: undefined,
        state: 'idle',
        hasLoadedOnce: true,
      })
      return
    }

    const executionStart = performance.now()
    const result = await module.loader()
    const executionTime = performance.now() - executionStart

    const totalTime = performance.now() - startTime

    // detect server redirect signal during refetch
    if (result?.__oneRedirect) {
      recordLoaderTiming?.({
        path: pathname,
        startTime,
        moduleLoadTime,
        executionTime,
        totalTime,
        source: 'refetch',
      })
      updateState(pathname, {
        data: undefined,
        state: 'idle',
        hasLoadedOnce: true,
      })
      router.replace(result.__oneRedirect)
      return
    }

    // detect 404 error signal during refetch
    // render 404 inline at current URL instead of navigating
    if (result?.__oneError === 404) {
      recordLoaderTiming?.({
        path: pathname,
        startTime,
        moduleLoadTime,
        executionTime,
        totalTime,
        source: 'refetch',
      })
      const notFoundRoute = findNearestNotFoundRoute(pathname, routeNode)
      setNotFoundState({
        notFoundPath: result.__oneNotFoundPath || '/+not-found',
        notFoundRouteNode: notFoundRoute || undefined,
        originalPath: pathname,
      })
      return
    }

    updateState(pathname, {
      data: result,
      state: 'idle',
      timestamp: Date.now(),
      hasLoadedOnce: true,
    })

    // also sync to the page match in clientMatches so components using the
    // match-based data path (useLoader with routeId stub) see the update
    const currentMatches = getClientMatchesSnapshot()
    const pageMatch = currentMatches[currentMatches.length - 1]
    // normalize trailing slashes: SSG matches may have trailing slash while
    // useLoaderState strips it from currentPath
    const normalizedPathname = pathname.replace(/\/$/, '') || '/'
    const normalizedMatchPathname = (pageMatch?.pathname || '').replace(/\/$/, '') || '/'
    if (pageMatch && normalizedMatchPathname === normalizedPathname) {
      updateMatchLoaderData(pageMatch.routeId, result)
    }

    recordLoaderTiming?.({
      path: pathname,
      startTime,
      moduleLoadTime,
      executionTime,
      totalTime,
      source: 'refetch',
    })
  } catch (err) {
    const totalTime = performance.now() - startTime

    updateState(pathname, {
      error: err,
      state: 'idle',
    })

    recordLoaderTiming?.({
      path: pathname,
      startTime,
      totalTime,
      error: err instanceof Error ? err.message : String(err),
      source: 'refetch',
    })

    throw err
  }
}

// Expose refetchLoader globally for HMR in development
if (process.env.NODE_ENV === 'development' && typeof window !== 'undefined') {
  ;(window as any).__oneRefetchLoader = refetchLoader
}

/**
 * Refetch the loader data for a specific match (identified by routeId) by fetching
 * the current page's loader JS and updating only that match entry in clientMatches.
 *
 * Note: the server's loader JS endpoint runs the *page* loader, so for layout
 * routeIds this fetches fresh page data and stores it on the layout match. A
 * dedicated per-layout refetch endpoint would be needed to truly re-run a layout
 * loader in isolation; that can be added in a follow-up.
 */
export async function refetchMatchLoader(
  routeId: string,
  currentPath: string
): Promise<void> {
  const cacheBust = `${Date.now()}`
  const loaderJSUrl = getLoaderPath(currentPath, true, cacheBust)

  const module = await dynamicImport(loaderJSUrl)?.catch(() => null)
  if (!module?.loader) return

  const result = await module.loader()
  if (result?.__oneRedirect || result?.__oneError) return

  updateMatchLoaderData(routeId, result)
}

/**
 * Access loader data with full state control including refetch capability.
 * Use this when you need loading state or refetch; use `useLoader` for just data.
 *
 * @param loader - The loader function (optional - omit for just refetch/state)
 * @returns Object with data, state ('idle' | 'loading'), and refetch function
 * @link https://onestack.dev/docs/api/hooks/useLoaderState
 *
 * @example
 * ```tsx
 * const { data, state, refetch } = useLoaderState(loader)
 *
 * return (
 *   <div>
 *     {state === 'loading' && <Spinner />}
 *     <button onClick={refetch}>Refresh</button>
 *     <pre>{JSON.stringify(data)}</pre>
 *   </div>
 * )
 * ```
 */
export function useLoaderState<
  Loader extends Function = any,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(
  loader?: Loader
): Loader extends undefined
  ? { refetch: () => Promise<void>; state: 'idle' | 'loading' }
  : {
      data: Returned extends Promise<any> ? Awaited<Returned> : Returned
      refetch: () => Promise<void>
      state: 'idle' | 'loading'
    } {
  const {
    loaderProps: loaderPropsFromServerContext,
    loaderData: loaderDataFromServerContext,
  } = useServerContext() || {}

  const params = useParams()
  const pathname = usePathname()
  // use just the pathname for matching, don't use resolveHref which adds params as query string
  // (the pathname is already resolved like /docs/getting-started, not /docs/[slug])
  const currentPath = pathname.replace(/\/index$/, '').replace(/\/$/, '') || '/'

  // server-side only — use pre-resolved loader data so dev and prod behave identically
  // (no re-running loaders during render, data comes from the same source the client gets)
  if (typeof window === 'undefined') {
    if (loader) {
      // 1) prod: WeakMap keyed by loader function (set by oneServe)
      if (ssrLoaderData.has(loader)) {
        return {
          data: ssrLoaderData.get(loader),
          refetch: async () => {},
          state: 'idle',
        } as any
      }
      // 2) dev/fallback: look up this route's data from the matches array in server context
      //    matches are built with per-route loaderData by both dev and prod handlers
      //    this avoids re-running loaders during render and keeps dev/prod identical
      const serverContext = useServerContext()
      if (serverContext?.matches) {
        const contextKey = useContextKey()
        const match = serverContext.matches.find(
          (m: any) => getContextKey(m.routeId) === contextKey
        )
        if (match && match.loaderData !== undefined) {
          return { data: match.loaderData, refetch: async () => {}, state: 'idle' } as any
        }
      }
      // 3) last resort fallback: run the loader
      const serverData = useAsyncFn(
        loader,
        loaderPropsFromServerContext || { path: pathname, params }
      )
      return { data: serverData, refetch: async () => {}, state: 'idle' } as any
    }
    // no loader function (useLoaderState without loader arg) — use page-level data
    if (loaderDataFromServerContext !== undefined) {
      return {
        data: loaderDataFromServerContext,
        refetch: async () => {},
        state: 'idle',
      } as any
    }
  }

  // detect if the loader stub returns a routeId string (set by clientTreeShakePlugin)
  // this enables looking up data from the matches array (needed for layout loaders)
  const matchRouteId = loader
    ? (() => {
        const result = loader()
        return typeof result === 'string' && result.startsWith('./') ? result : null
      })()
    : null

  // subscribe to clientMatches changes so refetch triggers re-render
  const clientMatches = useSyncExternalStore(
    subscribeToClientMatches,
    getClientMatchesSnapshot,
    getClientMatchesSnapshot
  )

  // preloaded data from SSR/SSG - only use if server context path matches current path
  const serverContextPath = loaderPropsFromServerContext?.path
  const preloadedData =
    serverContextPath === currentPath ? loaderDataFromServerContext : undefined

  // all hooks must be called unconditionally to satisfy React's rules of hooks
  const loaderStateEntry = useSyncExternalStore(
    subscribe,
    () => getLoaderState(currentPath, preloadedData),
    () => getLoaderState(currentPath, preloadedData)
  )

  const refetch = useCallback(() => refetchLoader(currentPath), [currentPath])

  // if the loader returns a routeId, look up data from matches instead of loaderState
  // only use this path when the match has data (layouts always have data preserved from SSR;
  // pages might have null loaderData during client navigation if preloading hasn't completed,
  // so they fall through to the regular loaderState path which handles suspension/loading)
  if (matchRouteId) {
    const match = clientMatches.find((m) => m.routeId === matchRouteId)
    // for page matches (the deepest/last match), verify the pathname matches currentPath.
    // during back/forward navigation, clientMatches may be stale (popstate doesn't update them),
    // so a dynamic route like [slug] could have data from a different URL.
    // layout matches (non-last) always use match data since their loaderState is path-keyed
    // to the page path, not the layout's own data.
    const isPageMatch =
      clientMatches.length > 0 &&
      clientMatches[clientMatches.length - 1]?.routeId === matchRouteId
    const matchPathNormalized = (match?.pathname || '').replace(/\/$/, '') || '/'
    const matchPathFresh = !isPageMatch || matchPathNormalized === currentPath
    if (match && match.loaderData != null && matchPathFresh) {
      return {
        data: match.loaderData,
        // refetch updates both loaderState (for useLoaderState() consumers without a loader)
        // and the match entry (for this component and useMatches consumers)
        refetch: async () => {
          await refetchLoader(currentPath)
          const fresh = loaderState[currentPath]
          if (fresh?.data != null) {
            updateMatchLoaderData(matchRouteId, fresh.data)
          }
        },
        state: loaderStateEntry.state,
      } as any
    }
  }

  // no loader, just return state/refetch for the path
  if (!loader) {
    return {
      refetch,
      state: loaderStateEntry.state,
    } as any
  }

  // start initial load if needed
  if (
    !loaderStateEntry.data &&
    !loaderStateEntry.promise &&
    !loaderStateEntry.hasLoadedOnce
  ) {
    // check for already-resolved preloaded data first (synchronous)
    // use != null to also exclude null values (which indicate preload failures)
    const resolvedPreloadData = preloadedLoaderData[currentPath]
    if (resolvedPreloadData != null) {
      // Data was preloaded and already resolved - use it directly
      delete preloadedLoaderData[currentPath]
      delete preloadingLoader[currentPath]
      loaderStateEntry.data = resolvedPreloadData
      loaderStateEntry.hasLoadedOnce = true
    } else if (preloadingLoader[currentPath]) {
      // Preload is in progress - wait for it
      const preloadPromise = preloadingLoader[currentPath]!
      const promise = preloadPromise
        .then((val: any) => {
          delete preloadingLoader[currentPath]
          delete preloadedLoaderData[currentPath]
          // null means preload failed - don't mark as loaded, let initial load handle it
          if (val != null) {
            updateState(currentPath, {
              data: val,
              hasLoadedOnce: true,
              promise: undefined,
            })
          } else {
            updateState(currentPath, {
              promise: undefined,
            })
          }
        })
        .catch((err: any) => {
          console.error(`Error running loader()`, err)
          delete preloadingLoader[currentPath]
          updateState(currentPath, {
            error: err,
            promise: undefined,
          })
        })

      loaderStateEntry.promise = promise
    } else {
      // initial load
      const loadData = async () => {
        const startTime = performance.now()

        try {
          if (process.env.TAMAGUI_TARGET === 'native') {
            let nativeLoaderJSUrl: string
            if (process.env.NODE_ENV === 'development') {
              // dev: ?platform=native tells vite plugin to return CJS
              nativeLoaderJSUrl = `${getLoaderPath(currentPath, true)}?platform=native`
            } else {
              // prod: request the .native.js static file directly
              // use uncached postfix since metro can't inline ONE_CACHE_KEY.
              // must use the static import — a dynamic require('./getURL') is
              // left as a runtime string require by metro and resolves to
              // undefined in the prod native bundle (crashes the route).
              const base = getURL()
              const cleanedPath = currentPath
                .slice(1)
                .replace(/\/$/, '')
                .replaceAll('_', '__')
                .replaceAll('/', '_')
              nativeLoaderJSUrl = `${base}/assets/${cleanedPath}${LOADER_JS_POSTFIX_UNCACHED.replace('.js', '.native.js')}`
            }

            try {
              const moduleLoadStart = performance.now()
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), LOADER_TIMEOUT)
              let loaderJsCode: string
              try {
                const loaderJsCodeResp = await fetch(nativeLoaderJSUrl, {
                  signal: controller.signal,
                })
                if (!loaderJsCodeResp.ok) {
                  throw new Error(`Response not ok: ${loaderJsCodeResp.status}`)
                }
                loaderJsCode = await loaderJsCodeResp.text()
              } finally {
                clearTimeout(timeoutId)
              }
              // use Function constructor instead of direct eval. hermes treats
              // direct eval as indirect (no lexical scope) and rolldown warns
              // about it; new Function is predictable across both engines and
              // explicitly threads the exports object through as a parameter.
              const result: { loader?: () => any } = {}
              new Function('exports', loaderJsCode)(result)
              const moduleLoadTime = performance.now() - moduleLoadStart

              if (typeof result.loader !== 'function') {
                throw new Error("Loader code isn't exporting a `loader` function")
              }

              const executionStart = performance.now()
              const data = await result.loader()
              const executionTime = performance.now() - executionStart
              const totalTime = performance.now() - startTime

              // detect server redirect signal on native
              if (data?.__oneRedirect) {
                recordLoaderTiming?.({
                  path: currentPath,
                  startTime,
                  moduleLoadTime,
                  executionTime,
                  totalTime,
                  source: 'initial',
                })
                updateState(currentPath, {
                  data: undefined,
                  hasLoadedOnce: true,
                  promise: undefined,
                })
                router.replace(data.__oneRedirect)
                return
              }

              // detect 404 error signal on native
              // render 404 inline at current URL instead of navigating
              if (data?.__oneError === 404) {
                recordLoaderTiming?.({
                  path: currentPath,
                  startTime,
                  moduleLoadTime,
                  executionTime,
                  totalTime,
                  source: 'initial',
                })
                const notFoundRoute = findNearestNotFoundRoute(currentPath, routeNode)
                setNotFoundState({
                  notFoundPath: data.__oneNotFoundPath || '/+not-found',
                  notFoundRouteNode: notFoundRoute || undefined,
                  originalPath: currentPath,
                })
                return
              }

              updateState(currentPath, {
                data,
                hasLoadedOnce: true,
                promise: undefined,
              })

              recordLoaderTiming?.({
                path: currentPath,
                startTime,
                moduleLoadTime,
                executionTime,
                totalTime,
                source: 'initial',
              })
              return
            } catch (e) {
              console.error(
                `[one] native loader error for ${currentPath}:`,
                e instanceof Error ? e.message : e,
                `url: ${nativeLoaderJSUrl}`
              )
              const totalTime = performance.now() - startTime
              updateState(currentPath, {
                data: {},
                promise: undefined,
              })
              recordLoaderTiming?.({
                path: currentPath,
                startTime,
                totalTime,
                error: e instanceof Error ? e.message : String(e),
                source: 'initial',
              })
              return
            }
          }

          // web platform
          const loaderJSUrl = getLoaderPath(currentPath, true)

          const moduleLoadStart = performance.now()
          const module = await dynamicImport(loaderJSUrl)?.catch(() => null)
          const moduleLoadTime = performance.now() - moduleLoadStart

          // gracefully handle missing loader (404, no loader export, etc)
          if (!module?.loader) {
            updateState(currentPath, {
              data: undefined,
              hasLoadedOnce: true,
              promise: undefined,
            })
            return
          }

          const executionStart = performance.now()
          const result = await module.loader()
          const executionTime = performance.now() - executionStart

          const totalTime = performance.now() - startTime

          // detect server redirect signal (fallback if preload didn't catch it)
          if (result?.__oneRedirect) {
            recordLoaderTiming?.({
              path: currentPath,
              startTime,
              moduleLoadTime,
              executionTime,
              totalTime,
              source: 'initial',
            })
            updateState(currentPath, {
              data: undefined,
              hasLoadedOnce: true,
              promise: undefined,
            })
            router.replace(result.__oneRedirect)
            return
          }

          // detect 404 error signal - render 404 inline at current URL
          if (result?.__oneError === 404) {
            recordLoaderTiming?.({
              path: currentPath,
              startTime,
              moduleLoadTime,
              executionTime,
              totalTime,
              source: 'initial',
            })
            const notFoundRoute = findNearestNotFoundRoute(currentPath, routeNode)
            setNotFoundState({
              notFoundPath: result.__oneNotFoundPath || '/+not-found',
              notFoundRouteNode: notFoundRoute || undefined,
              originalPath: currentPath,
            })
            return
          }

          updateState(currentPath, {
            data: result,
            hasLoadedOnce: true,
            promise: undefined,
          })

          recordLoaderTiming?.({
            path: currentPath,
            startTime,
            moduleLoadTime,
            executionTime,
            totalTime,
            source: 'initial',
          })
        } catch (err) {
          const totalTime = performance.now() - startTime

          updateState(currentPath, {
            error: err,
            promise: undefined,
          })

          recordLoaderTiming?.({
            path: currentPath,
            startTime,
            totalTime,
            error: err instanceof Error ? err.message : String(err),
            source: 'initial',
          })
        }
      }

      const promise = loadData()
      loaderStateEntry.promise = promise
    }
  }

  // handle errors and suspension (only on initial load)
  if (loaderStateEntry.error && !loaderStateEntry.hasLoadedOnce) {
    throw loaderStateEntry.error
  }

  if (
    loaderStateEntry.data === undefined &&
    loaderStateEntry.promise &&
    !loaderStateEntry.hasLoadedOnce
  ) {
    throw loaderStateEntry.promise
  }

  return {
    data: loaderStateEntry.data,
    refetch,
    state: loaderStateEntry.state,
  } as any
}

/**
 * Load route data with SSR/SSG support. Returns the loader's data directly.
 * For loading state and refetch capability, use `useLoaderState` instead.
 *
 * @param loader - The loader function exported from the route file
 * @returns The awaited return value of your loader function
 * @link https://onestack.dev/docs/api/hooks/useLoader
 *
 * @example
 * ```tsx
 * export async function loader({ params }) {
 *   return { user: await fetchUser(params.id) }
 * }
 *
 * export default function UserPage() {
 *   const { user } = useLoader(loader)
 *   return <div>{user.name}</div>
 * }
 * ```
 */
export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const { data } = useLoaderState(loader)
  return data
}

const results = new Map()
const started = new Map()

// Prevent unbounded growth of useAsyncFn caches. Under sustained client-side
// navigation with many unique param combinations, these can accumulate large
// API responses. 100 entries is generous for typical route counts.
const USE_ASYNC_FN_CACHE_MAX = 100

function setBoundedResults(key: string, value: any) {
  if (results.size >= USE_ASYNC_FN_CACHE_MAX && !results.has(key)) {
    const firstKey = results.keys().next().value
    if (firstKey !== undefined) {
      results.delete(firstKey as string)
      started.delete(firstKey as string)
    }
  }
  results.set(key, value)
}

// maps loader function → its route's loaderData for SSR
// populated before render in oneServe.ts, cleared after
// re-export for backwards compat
export { setSSRLoaderData } from './server/ssrLoaderData'

export function resetLoaderState() {
  results.clear()
  started.clear()
}

function useAsyncFn(val: any, props?: any) {
  const key = (val ? weakKey(val) : '') + JSON.stringify(props)

  if (val) {
    if (!started.get(key)) {
      started.set(key, true)

      let next = val(props)
      if (next instanceof Promise) {
        next = next
          .then((final) => {
            setBoundedResults(key, final)
          })
          .catch((err) => {
            console.error(`Error running loader()`, err)
            setBoundedResults(key, undefined)
          })
      }
      setBoundedResults(key, next)
    }
  }

  const current = results.get(key)

  if (current instanceof Promise) {
    throw current
  }

  return current
}
