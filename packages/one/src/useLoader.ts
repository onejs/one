import { useCallback, useDeferredValue, useSyncExternalStore } from 'react'
import { useParams, usePathname } from './hooks'
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

export async function refetchLoader(pathname: string): Promise<void> {
  updateState(pathname, {
    state: 'loading',
    error: null,
  })

  try {
    const cacheBust = `${Date.now()}`
    const loaderJSUrl = getLoaderPath(pathname, true, cacheBust)

    const module = await dynamicImport(loaderJSUrl)
    const result = await module.loader()

    updateState(pathname, {
      data: result,
      state: 'idle',
      timestamp: Date.now(),
      hasLoadedOnce: true,
    })
  } catch (err) {
    updateState(pathname, {
      error: err,
      state: 'idle',
    })
    throw err
  }
}

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
  const { loaderProps: loaderPropsFromServerContext, loaderData: loaderDataFromServerContext } =
    useServerContext() || {}

  const params = useParams()
  const pathname = usePathname()
  // use just the pathname for matching, don't use resolveHref which adds params as query string
  // (the pathname is already resolved like /docs/getting-started, not /docs/[slug])
  const currentPath = pathname.replace(/\/index$/, '').replace(/\/$/, '') || '/'

  // server-side - use a runtime check that can't be optimized away
  // We use loaderDataFromServerContext as the primary source of truth on the server
  // since the entrypoint already ran the loader
  if (loaderDataFromServerContext !== undefined && loader) {
    return { data: loaderDataFromServerContext, refetch: async () => {}, state: 'idle' } as any
  }

  // preloaded data from SSR/SSG - only use if server context path matches current path
  const serverContextPath = loaderPropsFromServerContext?.path
  const preloadedData = serverContextPath === currentPath ? loaderDataFromServerContext : undefined

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
    const resolvedPreloadData = preloadedLoaderData[currentPath]
    if (resolvedPreloadData !== undefined) {
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
          updateState(currentPath, {
            data: val,
            hasLoadedOnce: true,
            promise: undefined,
          })
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
        try {
          if (process.env.TAMAGUI_TARGET === 'native') {
            const loaderJSUrl = getLoaderPath(currentPath, true)
            const nativeLoaderJSUrl = `${loaderJSUrl}?platform=ios`

            try {
              const loaderJsCodeResp = await fetch(nativeLoaderJSUrl)
              if (!loaderJsCodeResp.ok) {
                throw new Error(`Response not ok: ${loaderJsCodeResp.status}`)
              }
              const loaderJsCode = await loaderJsCodeResp.text()
              // biome-ignore lint/security/noGlobalEval: we need eval for native
              const result = eval(`() => { var exports = {}; ${loaderJsCode}; return exports; }`)()

              if (typeof result.loader !== 'function') {
                throw new Error("Loader code isn't exporting a `loader` function")
              }

              const data = await result.loader()
              updateState(currentPath, {
                data,
                hasLoadedOnce: true,
                promise: undefined,
              })
              return
            } catch (e) {
              updateState(currentPath, {
                data: {},
                promise: undefined,
              })
              return
            }
          }

          // web platform
          const loaderJSUrl = getLoaderPath(currentPath, true)
          const module = await dynamicImport(loaderJSUrl)
          const result = await module.loader()
          updateState(currentPath, {
            data: result,
            hasLoadedOnce: true,
            promise: undefined,
          })
        } catch (err) {
          updateState(currentPath, {
            error: err,
            promise: undefined,
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

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const { data } = useLoaderState(loader)
  return data
}

const results = new Map()
const started = new Map()

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
