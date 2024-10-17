import { createRequire } from 'node:module'
import path from 'node:path'
import FSExtra from 'fs-extra'

const EXCLUDE_LIST = new Set(['react-native'])

/**
 * Since:
 *
 *   1) React is a CommonJS only package, and
 *   2) Vite SSR does not support direct import (or say, externalizing[^1]) of CommonJS packages
 *      (those packages need to be pre-bundled to work in SSR[^2]).
 *
 * We need to make React packages pre-bundled[^3] (or say, optimized) in the SSR environment, since
 * in the SSR environment, deps will default to be externalized and not pre-bundled.
 *
 * Since React is being pre-bundled, we need to make sure any other packages that depend on React are
 * also pre-bundled as well, because if a package is by default externalized (i.e. not pre-bundled),
 * it's import of React will be resolved to the externalized React (i.e. the one under `node_modules`)
 * but not the pre-bundled React, causing two different Reacts to be used in the same app and a `You might have more than one copy of React in the same app` error.
 *
 * Long story short, we need to pre-bundle React in SSR environment, and by doing so we also need to pre-bundle any other packages that depend on React.
 *
 * But we don't want to pre-bundle all the deps, since it's bad for performance and if a package is using things such as `__dirname` pre-bundling will break it.
 *
 * This function scans the `package.json` file of the project and returns a list of packages that depend on React, so that we can pre-bundle them in SSR environment.
 *
 * [^1]: https://vite.dev/guide/ssr.html#ssr-externals
 * [^2]: https://github.com/vitejs/vite/issues/9710#issuecomment-1217775350
 * [^3]: https://vite.dev/guide/dep-pre-bundling.html
 */
export async function scanDepsToPreBundleForSsr(
  packageJsonPath: string,
  {
    parentDepNames = [],
    proceededDeps = new Map(),
    pkgJsonContent,
  }: {
    parentDepNames?: string[]
    proceededDeps?: Map<string, string[]>
    /** If the content of the package.json is already read before calling this function, pass it here to avoid reading it again */
    pkgJsonContent?: any
  } = {}
): Promise<string[]> {
  console.log(`scan ${packageJsonPath}, parentDepNames: ${JSON.stringify(parentDepNames)}`)
  const isRoot = parentDepNames.length === 0
  const currentRoot = path.dirname(packageJsonPath)

  const pkgJson = pkgJsonContent || (await readPackageJsonSafe(packageJsonPath))
  const deps = [
    ...Object.keys(pkgJson.dependencies || {}),
    ...(isRoot ? Object.keys(pkgJson.devDependencies || {}) : []),
  ]

  return (
    await Promise.all(
      deps.map(async (dep) => {
        // skip circular deps
        if (parentDepNames.includes(dep)) {
          return []
        }
        const cachedResult = proceededDeps.get(dep)
        if (cachedResult) {
          return cachedResult
        }
        if (EXCLUDE_LIST.has(dep)) {
          return []
        }

        const depPkgJsonPath = await findDepPkgJsonPath(dep, currentRoot)
        if (!depPkgJsonPath) return []

        const depPkgJson = await readPackageJsonSafe(depPkgJsonPath)

        const subDepsToPreBundle = await scanDepsToPreBundleForSsr(depPkgJsonPath, {
          parentDepNames: [...parentDepNames, dep],
          pkgJsonContent: depPkgJson,
          proceededDeps,
        })

        const shouldPreBundle =
          subDepsToPreBundle.length >
            0 /* If this dep is depending on other deps that need pre-bundling, then also pre-bundle this dep */ ||
          depPkgJson.dependencies?.react ||
          (depPkgJson.peerDependencies?.react && !depPkgJson.peerDependenciesMeta?.react?.optional)

        const result = [...(shouldPreBundle ? [dep] : []), ...subDepsToPreBundle]

        proceededDeps.set(dep, result)
        return result
      })
    )
  )
    .flat()
    .filter((dep, index, arr) => arr.indexOf(dep) === index)
}

async function readPackageJsonSafe(packageJsonPath: string) {
  try {
    return await FSExtra.readJson(packageJsonPath)
  } catch (e) {
    console.error(
      `[scanDepsToPreBundleForSsr] Error reading package.json from ${packageJsonPath}: ${e}`
    )
    return {}
  }
}

export async function findDepPkgJsonPath(dep, dependent) {
  let root = dependent
  while (root) {
    const possiblePkgJson = path.join(root, 'node_modules', dep, 'package.json')

    if (await FSExtra.pathExists(possiblePkgJson)) {
      return possiblePkgJson
    }

    const nextRoot = path.dirname(root)
    if (nextRoot === root) break
    root = nextRoot
  }

  console.error(
    `[findDepPkgJsonPath] Could not find package.json for ${dep}, which is a dependency of ${dependent}`
  )

  return undefined
}
