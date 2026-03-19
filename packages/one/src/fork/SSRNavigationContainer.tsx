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
import { LinkingContext } from '@react-navigation/native'
import * as React from 'react'

const noop = () => {}

// minimal linking context for SSR — tabs needs .options to resolve triggers
const SSR_LINKING_CTX = { options: undefined as any }

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

// cache state contexts by navigation state identity to avoid deep clone thrashing
// under concurrent SSR requests with different URLs
const stateCtxCache = new WeakMap<object, {
  state: any
  getKey: () => string | undefined
  setKey: () => void
  getState: () => any
  setState: () => void
  getIsInitial: () => boolean
}>()

function getStateContext(initialState: any) {
  if (!initialState) {
    return {
      state: undefined,
      getKey: () => undefined as string | undefined,
      setKey: noop,
      getState: () => undefined,
      setState: noop,
      getIsInitial: () => true,
    }
  }

  const cached = stateCtxCache.get(initialState)
  if (cached) return cached

  const partial = getPartialState(initialState)
  const ctx = {
    state: partial,
    getKey: () => undefined as string | undefined,
    setKey: noop,
    getState: () => partial,
    setState: noop,
    getIsInitial: () => true,
  }
  stateCtxCache.set(initialState, ctx)
  return ctx
}

export function SSRNavigationContainer({
  initialState,
  theme,
  linking,
  children,
}: {
  initialState: any
  theme: any
  linking?: any
  children: React.ReactNode
}) {
  const linkingCtx = linking ? { options: linking } : SSR_LINKING_CTX
  return (
    <LinkingContext.Provider value={linkingCtx}>
      <NavigationBuilderContext.Provider value={SSR_BUILDER_CTX}>
        <NavigationStateContext.Provider value={getStateContext(initialState)}>
          <SingleNavigatorContext.Provider value={SSR_SINGLE_NAV_CTX}>
            <ThemeProvider value={theme}>{children}</ThemeProvider>
          </SingleNavigatorContext.Provider>
        </NavigationStateContext.Provider>
      </NavigationBuilderContext.Provider>
    </LinkingContext.Provider>
  )
}
