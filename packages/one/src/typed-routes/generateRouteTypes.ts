import { writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import FSExtra from 'fs-extra'
import micromatch from 'micromatch'
import { globbedRoutesToRouteContext } from '../router/useViteRoutes'
import { globDir } from '../utils/globDir'
import type { One } from '../vite/types'
import { getTypedRoutesDeclarationFile } from './getTypedRoutesDeclarationFile'
import { injectRouteHelpers, type InjectMode } from './injectRouteHelpers'
import { removeSupportedExtensions } from '../router/matchers'

export async function generateRouteTypes(
  outFile: string,
  routerRoot: string,
  ignoredRouteFiles?: string[],
  typedRoutesMode?: 'type' | 'runtime'
) {
  let routePaths = globDir(routerRoot)
  if (ignoredRouteFiles && ignoredRouteFiles.length > 0) {
    routePaths = micromatch.not(routePaths, ignoredRouteFiles, {
      // The path starts with './', such as './foo/bar/baz.test.tsx', and ignoredRouteFiles is like ['**/*.test.*'], so we need matchBase here.
      matchBase: true,
    })
  }
  const routes = routePaths.reduce((acc, cur) => {
    acc[cur] = {}
    return acc
  }, {})
  const context = globbedRoutesToRouteContext(routes, routerRoot)
  const declarations = getTypedRoutesDeclarationFile(context)
  const outDir = dirname(outFile)
  await FSExtra.ensureDir(outDir)
  await writeFile(outFile, declarations)

  // If experimental.typedRoutesGeneration is enabled, inject helpers into route files
  if (typedRoutesMode) {
    const mode: InjectMode = typedRoutesMode === 'type' ? 'type' : 'runtime'

    // Inject helpers into each route file
    for (const routePath of routePaths) {
      // Skip non-route files (layouts, middlewares, type definitions, etc.)
      if (
        routePath.includes('_layout') ||
        routePath.includes('+api') ||
        routePath.startsWith('_') ||
        routePath.endsWith('.d.ts')
      ) {
        continue
      }

      // Convert route path to route name
      // e.g., "./app/(site)/docs/[slug]+ssg.tsx" -> "/(site)/docs/[slug]"
      const fullPath = join(process.cwd(), routerRoot, routePath)
      const routeName = routePath
        .replace(/^\.\//, '')
        .replace(/\+[^/]*$/, '') // Remove +ssg, +ssr, etc.
        .replace(/\/index$/, '')
        .replace(/index$/, '')
      let cleanRouteName = removeSupportedExtensions(routeName).replace(/\/?index$/, '')

      // Ensure leading slash
      if (!cleanRouteName.startsWith('/')) {
        cleanRouteName = '/' + cleanRouteName
      }

      // Skip routes without dynamic segments (no params to type)
      if (!cleanRouteName.includes('[')) {
        continue
      }

      await injectRouteHelpers(fullPath, cleanRouteName, mode)
    }
  }
}
