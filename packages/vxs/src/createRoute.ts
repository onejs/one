import { useActiveParams, useParams, usePathname } from './hooks'
import type { VXSRouter } from './interfaces/router'

export function createRoute<Path>() {
  type Route = VXSRouter.Route<Path>
  type Params = Route['Params']

  return {
    useParams: () => useParams<Params>(),
    useActiveParams: () => useActiveParams<Params>(),
    createLoader: (a: Route['Loader']) => a,
  }
}
