import { createRoutesManifest } from '../server/createRoutesManifest'
import { getRoutePaths } from '../utils/routeIndex'

export function getManifest({
  routerRoot,
  ignoredRouteFiles,
  routePaths: routePathsIn,
}: {
  routerRoot: string
  ignoredRouteFiles?: string[]
  routePaths?: string[]
}) {
  const routePaths = routePathsIn ?? getRoutePaths(routerRoot, ignoredRouteFiles)
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}
