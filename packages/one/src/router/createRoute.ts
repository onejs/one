import { useActiveParams, useParams, usePathname } from '../hooks'
import type { OneRouter } from '../interfaces/router'

export function createRoute<Path>() {
  type Route = OneRouter.Route<Path>
  type Params = Route['Params']

  return {
    useParams: () => useParams<Params>(),
    useActiveParams: () => useActiveParams<Params>(),
    createLoader: (a: Route['Loader']) => a,
  }
}

const defaults = createRoute()

const getProxy = () =>
  new Proxy(
    {},
    {
      get(target, key) {
        if (Reflect.has(defaults, key)) {
          return Reflect.get(defaults, key)
        }

        return getProxy()
      },
    }
  )

const postIdRoute = createRoute<'/feed/[id]'>()

export const route = getProxy() as {
  feed: {
    $id: typeof postIdRoute
  }
  notifications: {}
  profile: {}
}
