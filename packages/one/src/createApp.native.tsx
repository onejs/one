import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import { useSyncExternalStore } from 'react'
import type { One } from './routeTypes'
import './polyfills-mobile'
import { Root } from './Root'
import './setup'
import type { CreateAppProps } from './createApp'
import type { GlobbedRouteImports } from './types'
import { getNativeLayoutKeys } from './router/getRoutes'
import { resetToRoot } from './router/router'
import { hydrateWarmInitialLoad } from './router/warmState'
import { PLATFORM } from './utils/platform'

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

export function createApp(options: CreateAppProps): void {
  if (options.flags?.warmStart) {
    hydrateWarmInitialLoad({ routes: options.routes, flags: options.flags })
  }
  let routes: GlobbedRouteImports = options.routes
  let routeVersion = 0
  let routeUpdate = 0
  const routeListeners = new Set<() => void>()
  const subscribeToRoutes = (listener: () => void) => {
    routeListeners.add(listener)
    return () => routeListeners.delete(listener)
  }
  const getRouteVersion = () => routeVersion
  ;(
    globalThis as typeof globalThis & {
      __VXRN_UPDATE_NATIVE_ROUTES__?: (nextRoutes: CreateAppProps['routes']) => void
    }
  ).__VXRN_UPDATE_NATIVE_ROUTES__ = (nextRoutes) => {
    // the router reads layout settings outside suspense, so preload them
    // before replacing the route map.
    const update = ++routeUpdate
    const layouts = getNativeLayoutKeys(Object.keys(nextRoutes), PLATFORM)
    Promise.allSettled(
      layouts.map((key) => Promise.resolve().then(() => nextRoutes[key]()))
    ).then((loaded) => {
      if (update !== routeUpdate) return
      const ready: GlobbedRouteImports = { ...nextRoutes }
      loaded.forEach((result, index) => {
        if (result.status === 'fulfilled') ready[layouts[index]] = () => result.value
      })
      routes = ready
      globalThis['__vxrnVersion'] = (globalThis['__vxrnVersion'] || 0) + 1
      globalThis['__vxrnresetState']?.()
      routeVersion++
      routeListeners.forEach((listener) => listener())
      resetToRoot()
    })
  }

  const App = () => {
    useSyncExternalStore(subscribeToRoutes, getRouteVersion, getRouteVersion)
    return (
      <Root
        isClient
        flags={options.flags}
        routes={routes}
        routerRoot={options.routerRoot}
        linking={options.linking}
        path="/"
      />
    )
  }

  AppRegistry.registerComponent('main', () => App)

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
  }
}
