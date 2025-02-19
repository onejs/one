// forked from @react-navigation/routers/src/StackRouter.tsx
// the only changes have @nate before them

import { StackRouter, type StackRouterOptions } from '@react-navigation/native'

export const CustomStackRouter = (options: StackRouterOptions) => {
  const router = StackRouter(options)

  const og = router.getStateForAction.bind(router)

  router.getStateForAction = (state, action, options) => {
    const next = og(state, action, options)

    // @nate
    // fix for [...spread] routes not having a stable useId() causing issues
    // this fixes it to be stable because we actually don't want to stack when its a ...spread route
    // i added a demo for this in test/test app /segments-stable-ids/c/d

    // for now only fixing on web since i don't want to test native too throughly
    if (process.env.TAMAGUI_TARGET !== 'native') {
      if (action.type === 'NAVIGATE') {
        if (next?.routes) {
          const outRoutes = next.routes

          const firstRoute = outRoutes[0]
          if (firstRoute.name.includes('[...')) {
            if (outRoutes.every((x) => x.name === firstRoute.name)) {
              // instead of stacking, just update the original one with the new params
              const next = { ...firstRoute }
              next.params = outRoutes[outRoutes.length - 1].params
              const routes = [next]
              return {
                ...next,
                routes,
                preloadedRoutes: state.preloadedRoutes.filter(
                  (route) => routes[routes.length - 1].key !== route.key
                ),
              } as any
            }
          }
        }
      }
    }

    return next
  }

  // react nav type error exporting
  return router as any
}
