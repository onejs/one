import type { GlobbedRouteImports } from './types'

// essentially a development helper

let context
let promise: Promise<void> | null = null

// for some reason putting it in state doesnt even re-render
export function useViteRoutes(routes: GlobbedRouteImports) {
  if (!promise && !context) {
    promise = new Promise((res) => {
      loadRoutes(routes).then(() => {
        promise = null
        res()
      })
    })
  }

  if (promise) {
    throw promise
  }

  return context
}

export async function loadRoutes(paths: any) {
  if (promise) await promise
  if (context) return context

  globalThis['__importMetaGlobbed'] = paths

  // make it look like webpack context
  const routesSync = {}
  await Promise.all(
    Object.keys(paths).map(async (path) => {
      if (!paths[path]) {
        console.error(`Error: Missing route at path ${path}`)
        return
      }
      try {
        const evaluated = await paths[path]()
        routesSync[path] = evaluated
        // this is a temp fix for matching webpack style routes:
        routesSync[path.replace('../app/', './')] = evaluated
      } catch (err) {
        // @ts-ignore
        console.error(`Error loading path ${path}: ${err?.message ?? ''} ${err?.stack ?? ''}`)
      }
    })
  )
  const moduleKeys = Object.keys(routesSync)
  function resolver(id: string) {
    return routesSync[id]
  }
  resolver.keys = () => moduleKeys
  resolver.id = ''
  resolver.resolve = (id: string) => id

  context = resolver
  promise = null

  return context
}
