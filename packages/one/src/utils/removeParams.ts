import type { NavigationState, PartialState } from '@react-navigation/native'

type AnyState = NavigationState | PartialState<NavigationState>

/**
 * removes specified params from all routes at every nesting level of a navigation state
 */
export function removeParams<T extends AnyState>(state: T, paramNames: string[]): T {
  if (!state?.routes) return state

  return {
    ...state,
    routes: state.routes.map((route) => {
      let newRoute = route

      if (route.params) {
        const filtered = { ...route.params }
        let changed = false
        for (const name of paramNames) {
          if (name in filtered) {
            delete (filtered as Record<string, unknown>)[name]
            changed = true
          }
        }
        if (changed) {
          newRoute = { ...newRoute, params: filtered }
        }
      }

      if (route.state) {
        const newState = removeParams(route.state as AnyState, paramNames)
        if (newState !== route.state) {
          newRoute = { ...newRoute, state: newState as any }
        }
      }

      return newRoute
    }),
  } as T
}
