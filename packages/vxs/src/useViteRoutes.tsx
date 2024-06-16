import { Text, View } from 'react-native'
import { CLIENT_BASE_URL } from './router/constants'
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
    const pathWithoutRelative = path.replace('/app/', './')
    const shouldRewrite = typeof window !== 'undefined' && !import.meta.env.PROD

    if (shouldRewrite) {
      // for SSR support we rewrite these:
      routesSync[pathWithoutRelative] = path.includes('_layout.')
        ? loadRouteFunction
        : () => {
            const realPath = (globalThis['__vxrntodopath'] ?? window.location.pathname).trim()
            const importUrl = `${CLIENT_BASE_URL}${realPath}_vxrn_loader.js`
            return import(/* @vite-ignore */ importUrl)
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

          return val
        })
        .catch((err) => {
          console.error(`Error loading route`, id, err)
          loadedRoutes[id] = {
            default: () => (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#000',
                  gap: 20,
                }}
              >
                <Text style={{ fontSize: 24, color: '#fff' }}>Error loading route</Text>
                <Text style={{ fontSize: 16, color: '#fff' }}>{id}</Text>
                <Text style={{ fontSize: 18, color: '#fff', maxWidth: 800 }}>{`${err}`}</Text>
              </View>
            ),
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

  context = resolve

  return context
}
