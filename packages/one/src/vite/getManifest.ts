import mm from 'micromatch'
import { createRoutesManifest } from '../server/createRoutesManifest'
import { globDir } from '../utils/globDir'

export function getManifest({ 
  routerRoot, 
  ignoredRouteFiles 
}: { 
  routerRoot: string
  ignoredRouteFiles?: string[]
}) {
  const routePaths = globDir(routerRoot)
  
  // Convert ignored glob patterns to RegExp for the ignore option
  const ignorePatterns = ignoredRouteFiles?.map((pattern) => mm.makeRe(pattern, { matchBase: true }))
  
  return createRoutesManifest(routePaths, {
    platform: 'web',
    ignore: ignorePatterns,
  })
}
