import FSExtra from 'fs-extra'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { globbedRoutesToRouteContext } from '../router/useViteRoutes'
import { globDir } from '../utils/globDir'
import { getTypedRoutesDeclarationFile } from './getTypedRoutesDeclarationFile'

export async function generateRouteTypes(outFile: string, routerRoot: string) {
  const routePaths = globDir('app')
  const routes = routePaths.reduce((acc, cur) => {
    acc[cur] = {}
    return acc
  }, {})
  const context = globbedRoutesToRouteContext(routes, routerRoot)
  const declarations = getTypedRoutesDeclarationFile(context)
  await FSExtra.ensureDir(dirname(outFile))
  await writeFile(outFile, declarations)
}
