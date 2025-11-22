/* eslint-disable react-hooks/rules-of-hooks */
import { useCallback, useEffect, useRef, useState } from 'react'
import { useActiveParams, useParams, usePathname } from './hooks'
import { resolveHref } from './link/href'
import { preloadingLoader } from './router/router'
import { getLoaderPath } from './utils/cleanUrl'
import { dynamicImport } from './utils/dynamicImport'
import { weakKey } from './utils/weakKey'
import { useServerContext } from './vite/one-server-only'

const promises: Record<string, undefined | Promise<void>> = {}
const errors = {}
const loadedData: Record<string, any> = {}

// Subscription system for data changes
const dataSubscribers = new Map<string, Set<() => void>>()

function subscribeToData(path: string, callback: () => void) {
  if (!dataSubscribers.has(path)) {
    dataSubscribers.set(path, new Set())
  }
  dataSubscribers.get(path)!.add(callback)

  return () => {
    dataSubscribers.get(path)?.delete(callback)
    if (dataSubscribers.get(path)?.size === 0) {
      dataSubscribers.delete(path)
    }
  }
}

function notifyDataChange(path: string) {
  dataSubscribers.get(path)?.forEach(cb => cb())
}

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const { loaderProps: loaderPropsFromServerContext, loaderData: loaderDataFromServerContext } =
    useServerContext() || {}

  // server side we just run the loader directly
  if (typeof window === 'undefined') {
    return useAsyncFn(
      loader,
      loaderPropsFromServerContext || {
        path: usePathname(),
        params: useActiveParams(),
      }
    )
  }

  const params = useParams()
  const pathname = usePathname()

  // Cannot use usePathname() here since it will change every time the route changes,
  // but here here we want to get the current local pathname which renders this screen.
  const currentPath = resolveHref({ pathname: pathname, params }).replace(/index$/, '')

  // only if it matches current route
  const preloadedData =
    loaderPropsFromServerContext?.path === currentPath ? loaderDataFromServerContext : undefined

  const currentData = useRef(preloadedData)
  const [, forceUpdate] = useReducer((x: number) => x + 1, 0)

  // Subscribe to data changes
  useEffect(() => {
    const unsubscribe = subscribeToData(currentPath, () => {
      // Update our ref and force re-render when data changes
      currentData.current = loadedData[currentPath]
      forceUpdate()
    })
    return unsubscribe
  }, [currentPath])

  useEffect(() => {
    if (preloadedData) {
      loadedData[currentPath] = preloadedData
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedData])

  if (errors[currentPath]) {
    throw errors[currentPath]
  }

  const loaded = loadedData[currentPath]

  // Check if we have updated data from subscription
  if (currentData.current !== undefined && currentData.current !== preloadedData) {
    return currentData.current
  }

  if (typeof loaded !== 'undefined') {
    return loaded
  }

  if (!preloadedData) {
    if (preloadingLoader[currentPath]) {
      if (typeof preloadingLoader[currentPath] === 'function') {
        preloadingLoader[currentPath] = preloadingLoader[currentPath]()
      }
      promises[currentPath] = preloadingLoader[currentPath]
        .then((val) => {
          loadedData[currentPath] = val
        })
        .catch((err) => {
          errors[currentPath] = err
          delete promises[currentPath]
          delete preloadingLoader[currentPath]
        })
    }

    if (!promises[currentPath]) {
      const getData = async () => {
        // for native add a prefix to route around vite dev server being in front of ours
        let loaderJSUrl = getLoaderPath(currentPath, true)


        try {
          const response = await (async () => {
            if (process.env.TAMAGUI_TARGET === 'native') {
              const nativeLoaderJSUrl = `${loaderJSUrl}?platform=ios` /* TODO: platform */

              try {
                // On native, we need to fetch the loader code and eval it
                const loaderJsCodeResp = await fetch(nativeLoaderJSUrl)
                if (!loaderJsCodeResp.ok) {
                  throw new Error(`Response not ok: ${loaderJsCodeResp.status}`)
                }
                const loaderJsCode = await loaderJsCodeResp.text()
                // biome-ignore lint/security/noGlobalEval: we can't use dynamic `import` on native so we need to fetch and `eval` the code
                const result = eval(
                  `() => { var exports = {}; ${loaderJsCode}; return exports; }`
                )()

                if (typeof result.loader !== 'function') {
                  throw new Error("Loader code isn't exporting a `loader` function")
                }

                return result
              } catch (e) {
                console.error(`Error fetching loader from URL: ${nativeLoaderJSUrl}, ${e}`)
                return { loader: () => ({}) }
              }
            }

            // On web, we can use import to dynamically load the loader
            return await dynamicImport(loaderJSUrl)
          })()

          loadedData[currentPath] = response.loader()
          return loadedData[currentPath]
        } catch (err) {
          console.error(`Error calling loader: ${err}`)
          errors[currentPath] = err
          delete promises[currentPath]
          return null
        }
      }
      promises[currentPath] = getData()
    }

    throw promises[currentPath]
  }

  return currentData.current
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

export function useLoaderState<
  Loader extends Function = any,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(
  loader?: Loader
): Loader extends undefined
  ? { refetch: () => void; state: 'idle' | 'loading' }
  : {
      data: Returned extends Promise<any> ? Awaited<Returned> : Returned
      refetch: () => void
      state: 'idle' | 'loading'
    } {
  const params = useParams()
  const pathname = usePathname()
  const currentPath = resolveHref({ pathname: pathname, params }).replace(/index$/, '')

  // State management
  const [isLoading, setIsLoading] = useState(false)
  const [data, setData] = useState<any>(() => loadedData[currentPath])
  const [error, setError] = useState<any>(null)

  // Subscribe to data changes
  useEffect(() => {
    const unsubscribe = subscribeToData(currentPath, () => {
      setData(loadedData[currentPath])
    })
    return unsubscribe
  }, [currentPath])

  // Initial load
  useEffect(() => {
    // If we already have data, use it
    if (loadedData[currentPath]) {
      setData(loadedData[currentPath])
    } else if (loader && !promises[currentPath]) {
      const loadData = async () => {
        try {
          const loaderJSUrl = getLoaderPath(currentPath, true)
          const module = await dynamicImport(loaderJSUrl)
          const result = await module.loader()

          loadedData[currentPath] = result
          setData(result)
          notifyDataChange(currentPath)
          delete promises[currentPath]
        } catch (err) {
          errors[currentPath] = err
          setError(err)
          delete promises[currentPath]
        }
      }

      promises[currentPath] = loadData()
    }
  }, [currentPath, loader])

  const refetch = useCallback(async () => {
    setIsLoading(true)

    try {
      // Clear promises and errors but keep existing data until we have new data
      delete promises[currentPath]
      delete errors[currentPath]

      // Get loader URL with cache busting
      let loaderJSUrl = getLoaderPath(currentPath, true)
      const timestamp = Date.now()
      const random = Math.random()
      loaderJSUrl += `${loaderJSUrl.includes('?') ? '&' : '?'}_t=${timestamp}&_r=${random}`

      // Import and execute loader
      const module = await dynamicImport(loaderJSUrl)
      const result = await module.loader()

      // Update cache and state
      loadedData[currentPath] = result
      setData(result)
      setError(null) // Clear any previous errors
      notifyDataChange(currentPath)
    } catch (err) {
      setError(err)
      errors[currentPath] = err
    } finally {
      setIsLoading(false)
    }
  }, [currentPath])

  // Handle SSR (simplified for now - just focusing on SPA/SSG)
  if (typeof window === 'undefined' && loader) {
    const serverData = useAsyncFn(loader, { path: pathname, params })
    return { data: serverData, refetch: () => {}, state: 'idle' } as any
  }

  if (loader) {
    // Handle initial load suspension
    if (!data && promises[currentPath]) {
      throw promises[currentPath]
    }

    if (error) {
      throw error
    }

    const state: 'idle' | 'loading' = isLoading ? 'loading' : 'idle'
    return { data, refetch, state } as any
  } else {
    const state: 'idle' | 'loading' = isLoading ? 'loading' : 'idle'
    return { refetch, state } as any
  }
}
