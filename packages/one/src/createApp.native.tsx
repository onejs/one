import { AppRegistry, LogBox } from 'react-native' // This should be the first import as it might set up global variables that are needed for the other imports
import { useSyncExternalStore } from 'react'
import type { One } from './vite/types'
import './polyfills-mobile'
import { Root } from './Root'
import { SafeAreaProvider, initialWindowMetrics } from './safe-area-context'
import './setup'
import type { CreateAppProps } from './createApp'

// TODO temporary
LogBox.ignoreLogs([/Sending .* with no listeners registered/])

export function createApp(options: CreateAppProps): void {
  let routes = options.routes
  let routeVersion = 0
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
    routes = nextRoutes
    globalThis['__vxrnVersion'] = (globalThis['__vxrnVersion'] || 0) + 1
    globalThis['__vxrnresetState']?.()
    routeVersion++
    routeListeners.forEach((listener) => listener())
  }

  const App = () => {
    useSyncExternalStore(subscribeToRoutes, getRouteVersion, getRouteVersion)
    // one owns the safe area provider, as it does on web: apps read it through
    // One.UI.SafeArea and never mount their own.
    return (
      <SafeAreaProvider initialMetrics={initialWindowMetrics}>
        <Root
          isClient
          flags={options.flags}
          routes={routes}
          routerRoot={options.routerRoot}
          linking={options.linking}
          path="/"
        />
      </SafeAreaProvider>
    )
  }

  AppRegistry.registerComponent('main', () => App)

  if (process.env.ONE_APP_NAME) {
    AppRegistry.registerComponent(process.env.ONE_APP_NAME, () => App)
  }
}
