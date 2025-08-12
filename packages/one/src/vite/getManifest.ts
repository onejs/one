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
  let routePaths = globDir(routerRoot)
  
  // Filter out ignored routes using the same approach as generateRouteTypes
  if (ignoredRouteFiles && ignoredRouteFiles.length > 0) {
    routePaths = mm.not(routePaths, ignoredRouteFiles, {
      // The path starts with './', such as './foo/bar/baz.test.tsx', and ignoredRouteFiles is like ['**/*.test.*'], so we need matchBase here.
      matchBase: true,
    })
  }
  
  return createRoutesManifest(routePaths, {
    platform: 'web',
  })
}
