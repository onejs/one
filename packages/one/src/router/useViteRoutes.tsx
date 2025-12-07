import type { GlobbedRouteImports } from '../types'
import type { One } from '../vite/types'

// essentially a development helper

let lastVersion = 0
let context

// for some reason putting it in state doesnt even re-render
export function useViteRoutes(
  routes: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions,
  version?: number
) {
  if (version && version > lastVersion) {
    // reload
    context = null
    lastVersion = version
  }

  if (!context) {
    loadRoutes(routes, routerRoot, options)
  }

  return context
}

// store preloaded modules so resolve() can use them synchronously
let preloadedModules: Record<string, any> = {}

export function registerPreloadedRoute(key: string, module: any): void {
  preloadedModules[key] = module
}

export function getPreloadedModule(key: string): any {
  return preloadedModules[key]
}

export function loadRoutes(
  paths: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions
) {
  if (context) return context
  globalThis['__importMetaGlobbed'] = paths
  context = globbedRoutesToRouteContext(paths, routerRoot, options)
  return context
}

export function globbedRoutesToRouteContext(
  paths: GlobbedRouteImports,
  routerRoot: string,
  options?: One.RouteOptions
): One.RouteContext {
  // make it look like webpack context
  const routesSync = {}
  const promises = {}
  const loadedRoutes = {}
  const clears = {}

  Object.keys(paths).forEach((path) => {
    if (!paths[path]) {
      console.error(`Error: Missing route at path ${path}`)
      return
    }
    const loadRouteFunction = paths[path]
    const pathWithoutRelative = path.replace(`/${routerRoot}/`, './')

    const originalPath = pathWithoutRelative.slice(1).replace(/\.[jt]sx?$/, '')
    if (options?.routeModes?.[originalPath] === 'spa') {
      console.info(`Spa mode: ${originalPath}`)
      // in SPA mode return null for any route
      loadedRoutes[pathWithoutRelative] = () => {
        return null
      }
    } else {
      routesSync[pathWithoutRelative] = loadRouteFunction
    }
  })

  const moduleKeys = Object.keys(routesSync)

  function resolve(id: string) {
    clearTimeout(clears[id])

    if (loadedRoutes[id]) {
      return loadedRoutes[id]
    }

    // check if this route was preloaded before hydration
    const preloadKey = id.replace('./', `/${routerRoot}/`)
    const preloaded = getPreloadedModule(preloadKey)
    if (preloaded) {
      loadedRoutes[id] = preloaded
      return preloaded
    }

    if (typeof routesSync[id] !== 'function') {
      return routesSync[id]
    }

    if (!promises[id]) {
      promises[id] = routesSync[id]()
        .then((val: any) => {
          loadedRoutes[id] = val
          delete promises[id]

          // clear cache so we get fresh contents in dev mode (hacky)
          clears[id] = setTimeout(() => {
            delete loadedRoutes[id]
          }, 500)

          return val
        })
        .catch((err) => {
          console.error(`Error loading route`, id, err, new Error().stack)
          loadedRoutes[id] = {
            default: () => null,
          }
          delete promises[id]
        })

      if (process.env.NODE_ENV === 'development') {
        promises[id].stack = new Error().stack
      }
    }

    // this is called in useScreens value.loadRoute
    // see getRoutes.ts contextModule.loadRoute
    // where contextModule === this resolve function
    throw promises[id]
  }

  resolve.keys = () => moduleKeys
  resolve.id = ''
  resolve.resolve = (id: string) => id

  return resolve
}
