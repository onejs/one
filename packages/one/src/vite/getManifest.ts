import micromatch from 'micromatch'
import { createRoutesManifest } from '../server/createRoutesManifest'
import { globDir } from '../utils/globDir'

export function getManifest({
  routerRoot,
  ignoredRouteFiles,
}: {
  routerRoot: string
  ignoredRouteFiles?: string[]
}) {
  let routePaths = globDir(routerRoot)
  if (ignoredRouteFiles?.length) {
    routePaths = micromatch.not(routePaths, ignoredRouteFiles, { matchBase: true })
  }
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}
