import FSExtra from 'fs-extra'
import { writeFile, readFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
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

  // If generating in node_modules/@types/one-routes, create package.json and update tsconfig
  if (outFile.includes('node_modules/@types/one-routes')) {
    const packageJsonPath = join(outDir, 'package.json')
    const packageJson = {
      name: '@types/one-routes',
      version: '1.0.0',
      private: true,
      types: 'index.d.ts',
    }
    await writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2))
    await ensureTsconfigIncludesOneRoutes(outDir)
  }
}

async function ensureTsconfigIncludesOneRoutes(typesDir: string) {
  const projectRoot = join(typesDir, '../../..')
  const tsconfigPath = join(projectRoot, 'tsconfig.json')

  try {
    const tsconfigContent = await readFile(tsconfigPath, 'utf-8')
    const tsconfig = JSON.parse(tsconfigContent)

    // Add one-routes to the types array if it exists
    // This ensures TypeScript picks up the types even when types array is specified
    if (tsconfig.compilerOptions?.types && Array.isArray(tsconfig.compilerOptions.types)) {
      if (!tsconfig.compilerOptions.types.includes('one-routes')) {
        tsconfig.compilerOptions.types.push('one-routes')
        await writeFile(tsconfigPath, JSON.stringify(tsconfig, null, 2) + '\n')
      }
    }
  } catch (error) {
    // Ignore errors - tsconfig might not exist or might be malformed
    console.warn('Could not update tsconfig.json:', error)
  }
}
