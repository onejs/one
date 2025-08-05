import FSExtra from 'fs-extra'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import micromatch from 'micromatch'
import { globbedRoutesToRouteContext } from '../router/useViteRoutes'
import { globDir } from '../utils/globDir'
import { getTypedRoutesDeclarationFile } from './getTypedRoutesDeclarationFile'

export async function generateRouteTypes(
  outFile: string,
  routerRoot: string,
  ignoredRouteFiles?: string[]
) {
  let routePaths = globDir(routerRoot)
  if (ignoredRouteFiles && ignoredRouteFiles.length > 0) {
    routePaths = routePaths.filter(
      (path) =>
      !micromatch.isMatch(path, ignoredRouteFiles, {
        // The path starts with './', such as './foo/bar/baz.test.tsx', and ignoredRouteFiles is like ['**/*.test.*'], so we need matchBase here.
        matchBase: true,
      })
    )
  }
  const routes = routePaths.reduce((acc, cur) => {
    acc[cur] = {}
    return acc
  }, {})
  const context = globbedRoutesToRouteContext(routes, routerRoot)
  const declarations = getTypedRoutesDeclarationFile(context)
  await FSExtra.ensureDir(dirname(outFile))
  await writeFile(outFile, declarations)
}
