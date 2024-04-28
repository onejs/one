import { useRef } from 'react'

export function useLoader<
  Loader extends Function,
  Returned = Loader extends (p: any) => any ? ReturnType<Loader> : unknown,
>(loader: Loader): Returned extends Promise<any> ? Awaited<Returned> : Returned {
  const initialData = useRef(globalThis['__vxrnLoaderData__'])
  return typeof loader === 'function' ? useAsyncFn(loader) : initialData.current
}

export type LoaderProps<Params extends Object = Record<string, string>> = {
  path: string
  params: Params
}

const results = new WeakMap()
const started = new WeakMap()

function useAsyncFn(val: any) {
  if (!started.get(val)) {
    started.set(val, true)

    let next = val()
    if (next instanceof Promise) {
      next = next.then((final) => {
        results.set(val, final)
      })
    }
    results.set(val, next)
  }

  const current = results.get(val)

  if (current instanceof Promise) {
    throw current
  }

  return current
}
