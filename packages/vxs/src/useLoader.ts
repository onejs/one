import { useEffect, useRef } from 'react'

const promises: Record<string, undefined | Promise<void>> = {}
const loadedData: Record<string, any> = {}

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const preloadedData = globalThis['__vxrnLoaderData__']
  const currentData = useRef(preloadedData)
  const currentPath =
    globalThis['__vxrntodopath'] ||
    // TODO likely either not needed or needs proper path from server side
    (typeof window !== 'undefined' ? window.location.pathname : '/')

  if (process.env.NODE_ENV === 'development') {
    // this fixes dev, breaks prod, can do it better
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (preloadedData) {
        loadedData[currentPath] = preloadedData
        globalThis['__vxrnLoaderData__'] = null
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [preloadedData])
  }

  // TODO
  if (!preloadedData) {
    const loaded = loadedData[currentPath]
    if (loaded) {
      return loaded
    }
    if (!promises[currentPath]) {
      const getData = async () => {
        const loaderJSUrl = `/_vxrn${currentPath}route.js`
        console.warn(`loading loader`, loaderJSUrl)
        const response = await import(loaderJSUrl)
        console.warn(`loader got back`, response)
        try {
          loadedData[currentPath] = response.loader()
          return loadedData[currentPath]
        } catch (err) {
          console.error(`Error calling loader: ${err}`)
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

// const results = new WeakMap()
// const started = new WeakMap()

// function useAsyncFn(val: any, props?: any) {
//   if (val) {
//     if (!started.get(val)) {
//       started.set(val, true)

//       let next = val(props)
//       if (next instanceof Promise) {
//         next = next
//           .then((final) => {
//             results.set(val, final)
//           })
//           .catch((err) => {
//             console.error(`Error running loader()`, err)
//             results.set(val, undefined)
//           })
//       }
//       results.set(val, next)
//     }
//   }

//   const current = val ? results.get(val) : val

//   if (current instanceof Promise) {
//     throw current
//   }

//   return current
// }
