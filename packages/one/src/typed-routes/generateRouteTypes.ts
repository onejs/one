import { readFile, writeFile } from 'node:fs/promises'
import { dirname, join, relative } from 'node:path'
import FSExtra from 'fs-extra'
import { removeSupportedExtensions } from '../router/matchers'
import { globbedRoutesToRouteContext } from '../router/useViteRoutes'
import { getRoutePaths } from '../utils/routeIndex'
import type { One } from '../vite/types'
import { getTypedRoutesDeclarationFile } from './getTypedRoutesDeclarationFile'
import {
  createSearchSchemaScanner,
  type SearchSchemaRef,
  type SearchSchemaScan,
} from './searchParamSchemas'
import { type InjectMode, injectRouteHelpers } from './injectRouteHelpers'
import { getSearchSchemaEntries } from './searchSchemaEntries'

const warnedUnassociated = new Set<string>()

function toSearchSchemaType(outDir: string, ref: SearchSchemaRef) {
  let specifier = ref.module
  if (ref.isFile) {
    specifier = relative(outDir, ref.module)
      .replaceAll('\\', '/')
      .replace(/\.(tsx?|jsx?|mjs)$/, '')
    if (!specifier.startsWith('.')) specifier = `./${specifier}`
  }
  const quote = (text: string) => `'${text.replace(/[\\']/g, '\\$&')}'`
  return `typeof import(${quote(specifier)})[${quote(ref.name)}]`
}

/**
 * Returns the files read to find component search schemas, so a watcher can
 * regenerate when one of them changes.
 */
export async function generateRouteTypes(
  outFile: string,
  routerRoot: string,
  ignoredRouteFiles?: string[],
  typedRoutesMode?: 'type' | 'runtime',
  routePathsIn?: string[]
): Promise<Set<string>> {
  const routePaths = routePathsIn ?? getRoutePaths(routerRoot, ignoredRouteFiles)
  // globDir returns paths relative to routerRoot (e.g. "./app/data.tsx" for a file at <routerRoot>/app/data.tsx).
  // globbedRoutesToRouteContext expects Vite-style paths with the routerRoot as a prefix
  // (e.g. "/app/app/data.tsx"), so it can strip it via `path.replace(`/${routerRoot}/`, './')`.
  const routes = routePaths.reduce((acc, cur) => {
    const vitePath = `/${routerRoot}/${cur.replace(/^\.\//, '')}`
    acc[vitePath] = {}
    return acc
  }, {})
  const context = globbedRoutesToRouteContext(routes, routerRoot)
  const outDir = dirname(outFile)
  const { scan: scanSearchSchemas } = createSearchSchemaScanner(process.cwd())
  const scannedFiles = new Set<string>()
  const declarations = getTypedRoutesDeclarationFile(context, {
    getSearchParamTypes(contextKey) {
      const scan: SearchSchemaScan = scanSearchSchemas(
        getSearchSchemaEntries(routePaths, contextKey).map((key) =>
          join(process.cwd(), routerRoot, key)
        )
      )
      for (const file of scan.files) scannedFiles.add(file)
      for (const { file, line } of scan.unassociated) {
        const where = `${relative(process.cwd(), file)}:${line}`
        if (warnedUnassociated.has(where)) continue
        warnedUnassociated.add(where)
        console.warn(
          `[one] ${where}: useSearchParams(schema) needs the schema to be an exported constant (or an import of one) so links can be typed from it`
        )
      }
      return scan.schemas.map((ref) => toSearchSchemaType(outDir, ref))
    },
  })
  let currentDeclarations: string | undefined
  try {
    currentDeclarations = await readFile(outFile, 'utf8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error
    }
  }

  if (currentDeclarations !== declarations) {
    await FSExtra.ensureDir(outDir)
    await writeFile(outFile, declarations)
  }

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

  return scannedFiles
}
