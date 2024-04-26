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
        const loadRouteFunction = paths[path]
        // TODO this is a temp fix for matching webpack style routes:
        const pathWithoutRelative = path.replace('../app/', './')

        if (typeof window !== 'undefined') {
          // for SSR support we rewrite these:
          routesSync[pathWithoutRelative] = path.includes('_layout.')
            ? loadRouteFunction
            : () => {
                const realPath = encodeURIComponent(
                  globalThis['__vxrntodopath'] ?? window.location.pathname
                )
                return import('/_vxrn' + pathWithoutRelative.slice(1) + '?pathname=' + realPath)
              }
        } else {
          routesSync[pathWithoutRelative] = loadRouteFunction
        }
      } catch (err) {
        // @ts-ignore
        console.error(`Error loading path ${path}: ${err?.message ?? ''} ${err?.stack ?? ''}`)
      } finally {
        clearTimeout(tm)
      }
    })
  )

  const promises = {}
  const loadedRoutes = {}
  const clears = {}

  const moduleKeys = Object.keys(routesSync)
  function resolve(id: string) {
    if (typeof routesSync[id] !== 'function') {
      return routesSync[id]
    }
    clearTimeout(clears[id])
    if (loadedRoutes[id]) {
      return loadedRoutes[id]
    }
    if (!promises[id]) {
      promises[id] = routesSync[id]().then((val: any) => {
        loadedRoutes[id] = val
        delete promises[id]

        // clear cache so we get fresh contents in dev mode (hacky)
        clears[id] = setTimeout(() => {
          delete loadedRoutes[id]
        }, 1000)
      })
    }
    throw promises[id]
  }

  resolve.keys = () => moduleKeys
  resolve.id = ''
  resolve.resolve = (id: string) => id

  context = resolve
  promise = null

  return context
}
