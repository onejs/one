import { useRef } from 'react'

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const initialData = useRef(globalThis['__vxrnLoaderData__'])
  return typeof loader === 'function'
    ? useAsyncFn(loader, globalThis['__vxrnLoaderProps__'])
    : initialData.current
}

export type LoaderProps<Params extends Object = Record<string, string>> = {
  path: string
  params: Params
}

const results = new WeakMap()
const started = new WeakMap()

function useAsyncFn(val: any, props?: any) {
  console.log('using async fn', started.get(val))

  if (!started.get(val)) {
    console.log('SET', val)
    started.set(val, true)

    let next = val(props)
    if (next instanceof Promise) {
      next = next
        .then((final) => {
          console.log('promise dun')
          results.set(val, final)
        })
        .catch((err) => {
          console.error(`Error running loader()`, err)
          results.set(val, undefined)
        })
    }
    results.set(val, next)
  }

  const current = results.get(val)
  console.log('current', current)

  if (current instanceof Promise) {
    throw current
  }

  return current
}
