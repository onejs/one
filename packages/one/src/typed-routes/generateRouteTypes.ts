import FSExtra from 'fs-extra'
import { writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import { globbedRoutesToRouteContext } from '../useViteRoutes'
import { globDir } from '../utils/globDir'
import { getTypedRoutesDeclarationFile } from './getTypedRoutesDeclarationFile'

export async function generateRouteTypes(outFile: string) {
  const routePaths = globDir('app')
  const routes = routePaths.reduce((acc, cur) => {
    acc[cur] = {}
    return acc
  }, {})
  const context = globbedRoutesToRouteContext(routes)
  const declarations = getTypedRoutesDeclarationFile(context)
  await FSExtra.ensureDir(dirname(outFile))
  await writeFile(outFile, declarations)
}
