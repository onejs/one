import { useCallback, useSyncExternalStore } from 'react'
import { registerDevtoolsFunction } from './devtools/registry'
import { useParams, usePathname } from './hooks'
import { router } from './router/imperative-api'
import { preloadedLoaderData, preloadingLoader } from './router/router'
import { getLoaderPath } from './utils/cleanUrl'
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

// Store timing history for devtools - only populated in development
const loaderTimingHistory: LoaderTimingEntry[] = []
const MAX_TIMING_HISTORY = 50

function recordLoaderTiming(entry: LoaderTimingEntry) {
  if (process.env.NODE_ENV !== 'development') return

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

export function getLoaderTimingHistory(): LoaderTimingEntry[] {
  return loaderTimingHistory
}

// Register with devtools registry so router.ts doesn't need to dynamically import us
registerDevtoolsFunction('getLoaderTimingHistory', getLoaderTimingHistory)
registerDevtoolsFunction('recordLoaderTiming', recordLoaderTiming)

const loaderState: Record<string, LoaderStateEntry> = {}
const subscribers = new Set<() => void>()

function updateState(path: string, updates: Partial<LoaderStateEntry>) {
  loaderState[path] = { ...loaderState[path], ...updates }
  subscribers.forEach((callback) => {
    callback()
  })
}

function subscribe(callback: () => void) {
  subscribers.add(callback)
  return () => subscribers.delete(callback)
}

function getLoaderState(path: string, preloadedData?: any): LoaderStateEntry {
  if (!loaderState[path]) {
    loaderState[path] = {
      data: preloadedData,
      error: undefined,
      promise: undefined,
      state: 'idle',
      hasLoadedOnce: !!preloadedData,
    }
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
      recordLoaderTiming({
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
    if (result?.__oneError === 404) {
      recordLoaderTiming({
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
      router.replace('/+not-found')
      return
    }

    updateState(pathname, {
      data: result,
      state: 'idle',
      timestamp: Date.now(),
      hasLoadedOnce: true,
    })

    recordLoaderTiming({
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

    recordLoaderTiming({
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

  // server-side only - typeof window check ensures this never runs on client
  if (typeof window === 'undefined' && loader) {
    const serverData = useAsyncFn(
      loader,
      loaderPropsFromServerContext || {
        path: pathname,
        params,
      }
    )
    return { data: serverData, refetch: async () => {}, state: 'idle' } as any
  }

  // preloaded data from SSR/SSG - only use if server context path matches current path
  const serverContextPath = loaderPropsFromServerContext?.path
  const preloadedData =
    serverContextPath === currentPath ? loaderDataFromServerContext : undefined

  const loaderStateEntry = useSyncExternalStore(
    subscribe,
    () => getLoaderState(currentPath, preloadedData),
    () => getLoaderState(currentPath, preloadedData)
  )

  const refetch = useCallback(() => refetchLoader(currentPath), [currentPath])

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
    !loaderStateEntry.hasLoadedOnce &&
    loader
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
            const loaderJSUrl = getLoaderPath(currentPath, true)
            const nativeLoaderJSUrl = `${loaderJSUrl}?platform=ios`

            try {
              const moduleLoadStart = performance.now()
              const loaderJsCodeResp = await fetch(nativeLoaderJSUrl)
              if (!loaderJsCodeResp.ok) {
                throw new Error(`Response not ok: ${loaderJsCodeResp.status}`)
              }
              const loaderJsCode = await loaderJsCodeResp.text()
              // biome-ignore lint/security/noGlobalEval: we need eval for native
              const result = eval(
                `() => { var exports = {}; ${loaderJsCode}; return exports; }`
              )()
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
                recordLoaderTiming({
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
              if (data?.__oneError === 404) {
                recordLoaderTiming({
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
                router.replace('/+not-found')
                return
              }

              updateState(currentPath, {
                data,
                hasLoadedOnce: true,
                promise: undefined,
              })

              recordLoaderTiming({
                path: currentPath,
                startTime,
                moduleLoadTime,
                executionTime,
                totalTime,
                source: 'initial',
              })
              return
            } catch (e) {
              const totalTime = performance.now() - startTime
              updateState(currentPath, {
                data: {},
                promise: undefined,
              })
              recordLoaderTiming({
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
            recordLoaderTiming({
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

          // detect 404 error signal - navigate to not-found page
          if (result?.__oneError === 404) {
            recordLoaderTiming({
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
              error: new Error(result.__oneErrorMessage || 'Not Found'),
            })
            // navigate to the not-found page for this path
            router.replace('/+not-found')
            return
          }

          updateState(currentPath, {
            data: result,
            hasLoadedOnce: true,
            promise: undefined,
          })

          recordLoaderTiming({
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

          recordLoaderTiming({
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

  // handle errors and suspension
  if (loader) {
    // only throw error on initial load
    if (loaderStateEntry.error && !loaderStateEntry.hasLoadedOnce) {
      throw loaderStateEntry.error
    }

    // only throw promise for suspension on initial load
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
  } else {
    return {
      refetch,
      state: loaderStateEntry.state,
    } as any
  }
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
            results.set(key, final)
          })
          .catch((err) => {
            console.error(`Error running loader()`, err)
            results.set(key, undefined)
          })
      }
      results.set(key, next)
    }
  }

  const current = results.get(key)

  if (current instanceof Promise) {
    throw current
  }

  return current
}
