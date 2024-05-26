/* eslint-disable react-hooks/rules-of-hooks */
import { useEffect, useRef } from 'react'
import { weakKey } from './utils/weakKey'
import { preloadingLoader } from './global-state/routing'
import { CLIENT_BASE_URL } from './global-state/constants'

const promises: Record<string, undefined | Promise<void>> = {}
const errors = {}
const loadedData: Record<string, any> = {}

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  // server side we just run the loader directly
  if (typeof window === 'undefined') {
    return useAsyncFn(loader, globalThis['__vxrnLoaderProps__'])
  }

  const preloadedData = globalThis['__vxrnLoaderData__']
  const currentData = useRef(preloadedData)
  const currentPath =
    globalThis['__vxrntodopath'] ||
    // TODO likely either not needed or needs proper path from server side
    (typeof window !== 'undefined' ? window.location.pathname : '/')

  useEffect(() => {
    if (preloadedData) {
      loadedData[currentPath] = preloadedData
      globalThis['__vxrnLoaderData__'] = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preloadedData])

  if (errors[currentPath]) {
    throw errors[currentPath]
  }

  // TODO
  if (!preloadedData) {
    const loaded = loadedData[currentPath]
    if (loaded) {
      return loaded
    }

    if (preloadingLoader[currentPath]) {
      console.warn('were loading it meo')
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
        const loaderJSUrl = `${CLIENT_BASE_URL}${currentPath}_vxrn_loader.js`
        const response = await import(loaderJSUrl)
        try {
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

export type LoaderProps<Params extends Object = Record<string, string>> = {
  path: string
  params: Params
}

const results = new Map()
const started = new Map()

function useAsyncFn(val: any, props?: any) {
  const key = weakKey(val) + JSON.stringify(props)

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
