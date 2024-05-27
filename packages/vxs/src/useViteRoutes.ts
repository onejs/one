import { CLIENT_BASE_URL } from './global-state/constants'
import type { GlobbedRouteImports } from './types'

// essentially a development helper

let lastVersion = 0
let context

// for some reason putting it in state doesnt even re-render
export function useViteRoutes(routes: GlobbedRouteImports, version?: number) {
  if (version && version > lastVersion) {
    // reload
    context = null
    lastVersion = version
  }

  if (!context) {
    loadRoutes(routes)
  }

  return context
}

export function loadRoutes(paths: Record<string, () => Promise<any>>) {
  if (context) return context

  globalThis['__importMetaGlobbed'] = paths

  // make it look like webpack context
  const routesSync = {}

  Object.keys(paths).map((path) => {
    if (!paths[path]) {
      console.error(`Error: Missing route at path ${path}`)
      return
    }
    const loadRouteFunction = paths[path]
    // TODO this is a temp fix for matching webpack style routes:
    const pathWithoutRelative = path.replace('../app/', './')
    const shouldRewrite = typeof window !== 'undefined' && !import.meta.env.PROD

    if (shouldRewrite) {
      // for SSR support we rewrite these:
      routesSync[pathWithoutRelative] = path.includes('_layout.')
        ? loadRouteFunction
        : () => {
            const realPath = globalThis['__vxrntodopath'] ?? window.location.pathname
            return import(`${CLIENT_BASE_URL}${realPath}_vxrn_loader.js`)
          }
    } else {
      routesSync[pathWithoutRelative] = loadRouteFunction
    }
  })

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
      promises[id] = routesSync[id]()
        // adding artifical delay to test
        // .then(async (val) => {
        //   await new Promise((res) => setTimeout(res, 2000))
        //   return val
        // })
        .then((val: any) => {
          loadedRoutes[id] = val
          delete promises[id]

          // clear cache so we get fresh contents in dev mode (hacky)
          clears[id] = setTimeout(() => {
            delete loadedRoutes[id]
          }, 500)
        })
        .catch((err) => {
          console.error(`Error loading route`, id, err)
          delete promises[id]
          loadedRoutes[id] = () => null
        })
    }

    if (process.env.NODE_ENV === 'development') {
      promises[id].stack = new Error().stack
    }

    // this is called in useScreens value.loadRoute
    // see getRoutes.ts contextModule.loadRoute
    // where contextModule === this resolve function
    throw promises[id]
  }

  resolve.keys = () => moduleKeys
  resolve.id = ''
  resolve.resolve = (id: string) => id

  context = resolve

  return context
}
