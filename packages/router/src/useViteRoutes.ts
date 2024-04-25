import type { GlobbedRouteImports } from './types'

// essentially a development helper

let lastVersion = 0
let context
let promise: Promise<void> | null = null

// for some reason putting it in state doesnt even re-render
export function useViteRoutes(routes: GlobbedRouteImports, version?: number) {
  if (version && version > lastVersion) {
    // reload
    context = null
    lastVersion = version
  }

  if (!promise && !context) {
    promise = new Promise((res) => {
      loadRoutes(routes).then(() => {
        res()
        promise = null
      })
    })
  }

  if (promise) {
    throw promise
  }

  return context
}

export const loadingRoutes = new Set()

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
      const tm = setTimeout(() => {
        console.error(`Error: Timed out loading ${path}`)
      }, 1000)
      try {
        const evaluated = paths[path]
        routesSync[path] = evaluated
        // this is a temp fix for matching webpack style routes:
        routesSync[path.replace('../app/', './')] = evaluated
      } catch (err) {
        // @ts-ignore
        console.error(`Error loading path ${path}: ${err?.message ?? ''} ${err?.stack ?? ''}`)
      } finally {
        clearTimeout(tm)
      }
    })
  )
  const moduleKeys = Object.keys(routesSync)
  function resolve(id: string) {
    if (typeof routesSync[id] === 'function') {
      const promise = routesSync[id]().then((val: any) => {
        routesSync[id] = val
        loadingRoutes.delete(promise)
      })
      loadingRoutes.add(promise)
      return { default: null }
    }

    return routesSync[id]
  }
  resolve.keys = () => moduleKeys
  resolve.id = ''
  resolve.resolve = (id: string) => id

  context = resolve
  promise = null

  return context
}
