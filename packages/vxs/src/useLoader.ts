import { useEffect, useRef, useState } from 'react'

const promises = {}

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const loadedData = globalThis['__vxrnLoaderData__']
  const initialData = useRef(loadedData)
  const [loadedPaths, setLoadedPaths] = useState({})

  // TODO
  // const currentPath = globalThis['__vxrntodopath'] || '' as string
  // if (!loadedPaths[currentPath]) {
  //   if (!promises[currentPath]) {
  //     promises[currentPath] = () => {
  //       fetch(`/_vxrn/`)
  //     }
  //   }
  // }

  if (process.env.NODE_ENV === 'development') {
    // this fixes dev, breaks prod, can do it better
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useEffect(() => {
      if (loadedData) {
        globalThis['__vxrnLoaderData__'] = null
      }
    }, [loadedData])
  }

  return (
    initialData.current ??
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useAsyncFn(loader, globalThis['__vxrnLoaderProps__'])
  )
}

export type LoaderProps<Params extends Object = Record<string, string>> = {
  path: string
  params: Params
}

const results = new WeakMap()
const started = new WeakMap()

function useAsyncFn(val: any, props?: any) {
  if (val) {
    if (!started.get(val)) {
      started.set(val, true)

      let next = val(props)
      if (next instanceof Promise) {
        next = next
          .then((final) => {
            results.set(val, final)
          })
          .catch((err) => {
            console.error(`Error running loader()`, err)
            results.set(val, undefined)
          })
      }
      results.set(val, next)
    }
  }

  const current = val ? results.get(val) : val

  if (current instanceof Promise) {
    throw current
  }

  return current
}
