/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef } from 'react'
import { useActiveParams, useParams, usePathname } from './hooks'
import { resolveHref } from './link/href'
import { useRouteNode } from './router/Route'
import { preloadingLoader } from './router/router'
import { getLoaderPath } from './utils/cleanUrl'
import { dynamicImport } from './utils/dynamicImport'
import { getServerContext } from './vite/server'
import { weakKey } from './utils/weakKey'

const promises: Record<string, undefined | Promise<void>> = {}
const errors = {}
const loadedData: Record<string, any> = {}

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const { loaderProps: loaderPropsFromServerContext, loaderData: loaderDataFromServerContext } =
    getServerContext() || {}

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
  const currentPath = resolveHref({ pathname: pathname, params })
    .replace(/index$/, '')
    .replace(/\?.*/, '')

  // only if it matches current route
  const preloadedData =
    loaderPropsFromServerContext?.path === currentPath ? loaderDataFromServerContext : undefined

  const currentData = useRef(preloadedData)

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
          console.error(`Error loading loader`, err)
          errors[currentPath] = err
          delete promises[currentPath]
          delete preloadingLoader[currentPath]
        })
    }

    if (!promises[currentPath]) {
      const getData = async () => {
        // for native add a prefix to route around vite dev server being in front of ours
        const loaderJSUrl = getLoaderPath(currentPath, true)

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
