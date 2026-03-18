/**
 * SSR-optimized replacement for BaseNavigationContainer.
 * Provides only the 4 contexts that child navigators need during SSR render,
 * with static/no-op values. Eliminates 32+ hooks and reduces 8 providers to 4.
 *
 * Requires @react-navigation/core package.json exports to include internal context paths.
 * See postinstall patch in the repo.
 */

// @ts-ignore internal module (exports patched at install time)
import { NavigationBuilderContext } from '@react-navigation/core/lib/module/NavigationBuilderContext'
// @ts-ignore internal module
import { NavigationStateContext } from '@react-navigation/core/lib/module/NavigationStateContext'
// @ts-ignore internal module
import { SingleNavigatorContext } from '@react-navigation/core/lib/module/EnsureSingleNavigator'
import { ThemeProvider } from '@react-navigation/core'
import * as React from 'react'

const noop = () => {}

// static context values — never change, zero allocations per render
const SSR_BUILDER_CTX = {
  onDispatchAction: noop,
  onOptionsChange: noop,
  // must execute callback immediately — useNavigationBuilder calls this during render
  scheduleUpdate: (cb: () => void) => cb(),
  flushUpdates: noop,
  stackRef: { current: undefined },
}

const SSR_SINGLE_NAV_CTX = {
  register: noop,
  unregister: noop,
}

const getPartialState = (state: any): any => {
  if (!state) return undefined
  const { key, routeNames, ...partial } = state
  return {
    ...partial,
    stale: true as const,
    routes: state.routes.map((route: any) =>
      route.state ? { ...route, state: getPartialState(route.state) } : route
    ),
  }
}

// cache by initialState reference
let _cachedState: any = null
let _cachedCtx: any = null

function getStateContext(initialState: any) {
  if (_cachedState === initialState && _cachedCtx) return _cachedCtx
  const partial = getPartialState(initialState)
  _cachedCtx = {
    state: partial,
    getKey: () => undefined as string | undefined,
    setKey: noop,
    getState: () => partial,
    setState: noop,
    getIsInitial: () => true,
  }
  _cachedState = initialState
  return _cachedCtx
}

export function SSRNavigationContainer({
  initialState,
  theme,
  children,
}: {
  initialState: any
  theme: any
  children: React.ReactNode
}) {
  return (
    <NavigationBuilderContext.Provider value={SSR_BUILDER_CTX}>
      <NavigationStateContext.Provider value={getStateContext(initialState)}>
        <SingleNavigatorContext.Provider value={SSR_SINGLE_NAV_CTX}>
          <ThemeProvider value={theme}>{children}</ThemeProvider>
        </SingleNavigatorContext.Provider>
      </NavigationStateContext.Provider>
    </NavigationBuilderContext.Provider>
  )
}
