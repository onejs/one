import FSExtra from 'fs-extra'
import path, { dirname, extname, join, sep } from 'node:path'

export type ScanDepsResult = {
  prebundleDeps: string[]
  hasReanimated: boolean
  hasNativewind: boolean
}

/** Known packages that will fail to pre-bundle, or no need to pre-bundle. */
export const EXCLUDE_LIST = [
  'fsevents',
  '@swc/core',
  '@swc/core-darwin-arm64',
  '@swc/core-darwin-x64',
  '@swc/core-linux-arm-gnueabihf',
  '@swc/core-linux-arm64-gnu',
  '@swc/core-linux-arm64-musl',
  '@swc/core-linux-x64-gnu',
  '@swc/core-linux-x64-musl',
  '@swc/core-win32-arm64-msvc',
  '@swc/core-win32-ia32-msvc',
  '@swc/core-win32-x64-msvc',
  'lightningcss',

  '@sentry/react-native',

  // not ever to be used in app
  '@expo/cli',
  'expo-structured-headers',

  // not used by web anyway
  // Could not read from file: /Users/n8/one/node_modules/react-native-web/dist/cjs/index.js/Libraries/Image/AssetRegistry
  // /lib/module/Platform/Platform.web.js:132:20
  '@shopify/react-native-skia',

  // web breaks trying to scan deps
  'react-native-bottom-tabs',

  '@react-native/virtualized-lists', // Unexpected "typeof" in `node_modules/@react-native/virtualized-lists/index.js`

  // Native only, we don't expect SSR to use these packages.
  // Also, some of these packages might attempt to import from react-native internals, which will break in SSR while react-native is aliased to react-native-web.
  '@vxrn/react-native-prebuilt',
  '@vxrn/vite-native-hmr',
  '@vxrn/compiler',
  '@vxrn/vite-native-client',
  'react-native-ios-utilities',
  'react-native-ios-modal',
  'react-native-image-colors',
  'react-native-fast-image',
  'react-native-device-info',

  // CLI shouldn't be used in SSR runtime
  '@tamagui/cli',

  '@storybook/react',
]

export const EXCLUDE_LIST_SET = new Set(EXCLUDE_LIST)

export const INCLUDE_LIST = [
  // ReferenceError: exports is not defined - at eval (.../node_modules/inline-style-prefixer/lib/createPrefixer.js:3:23)
  'inline-style-prefixer',
  'react-native-vector-icons',
]

export const INCLUDE_LIST_SET = new Set(INCLUDE_LIST)

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

const rootOptions = {}

export async function scanDepsToOptimize(
  packageJsonPath: string,
  options: {
    parentDepNames?: string[]
    proceededDeps?: Map<string, string[]>
    /** If the content of the package.json is already read before calling this function, pass it here to avoid reading it again */
    pkgJsonContent?: any
  } = rootOptions
): Promise<ScanDepsResult> {
  const { parentDepNames = [], proceededDeps = new Map(), pkgJsonContent } = options

  if (options === rootOptions) {
    console.info(`[one] Scanning node_modules to auto-optimize...`)
  }

  const currentRoot = path.dirname(packageJsonPath)

  const pkgJson = pkgJsonContent || (await readPackageJsonSafe(packageJsonPath))
  const deps = [...Object.keys(pkgJson.dependencies || {})]

  let hasReanimated = !!pkgJson.dependencies?.['react-native-reanimated']

  const prebundleDeps = (
    await Promise.all(
      deps.map(async (dep): Promise<string[]> => {
        // skip circular deps
        if (parentDepNames.includes(dep)) {
          return []
        }
        const cachedResult = proceededDeps.get(dep)
        if (cachedResult) {
          return cachedResult
        }
        if (EXCLUDE_LIST_SET.has(dep)) {
          return []
        }

        // lets be a bit conservative and assume react-native starting packages are
        // if (dep.startsWith('react-native-') || dep.startsWith(`@react-native-`)) {
        //   return []
        // }

        const depPkgJsonPath = await findDepPkgJsonPath(dep, currentRoot)
        if (!depPkgJsonPath) return []

        const depPkgJson = await readPackageJsonSafe(depPkgJsonPath)

        if (depPkgJson.dependencies?.['react-native-reanimated']) {
          hasReanimated = true
        }

        const subDeps = await scanDepsToOptimize(depPkgJsonPath, {
          parentDepNames: [...parentDepNames, dep],
          pkgJsonContent: depPkgJson,
          proceededDeps,
        })

        if (subDeps.hasReanimated) {
          hasReanimated = true
        }

        const shouldPreBundle =
          subDeps.prebundleDeps.length >
            0 /* If this dep is depending on other deps that need pre-bundling, then also pre-bundle this dep */ ||
          INCLUDE_LIST_SET.has(dep) /* If this dep is in the include list, then pre-bundle it */ ||
          hasRequiredDep(depPkgJson, 'react') ||
          hasRequiredDep(depPkgJson, 'react-native') ||
          hasRequiredDep(depPkgJson, 'expo-modules-core') ||
          // Expo deps are often ESM but without including file extensions in import paths, making it not able to run directly by Node.js, so we need to pre-bundle them.
          dep.startsWith('@expo/') ||
          dep.startsWith('expo-')

        const depsToPreBundle = await (async () => {
          if (!shouldPreBundle) {
            return []
          }

          const depPkgJsonExports = depPkgJson.exports || {}
          // We take a more conservative approach to exclude potentially problematic exports entries. This might result in some valid exports entries being excluded, but it ensures that problematic ones are not included, thereby preventing issues.
          const definedExports = Object.keys(depPkgJsonExports)
            .filter((k) => {
              const expData = depPkgJsonExports[k]
              const imp = typeof expData === 'string' ? expData : expData?.import
              if (typeof imp !== 'string') {
                // Skipping since it will cause error `No known conditions for "..." specifier in "..." package`.
                // Note that by doing this, nested exports will be skipped as well.
                return false
              }
              if (!imp.endsWith('.js')) {
                // Skipping since non-js exports cannot be pre-bundled.
                return false
              }

              // Only include exports that are named safely.
              // This is a conservative approach; we might have a better way to make the judgment.
              if (!k.match(/^(\.\/)?[a-zA-Z0-9-_]+$/)) {
                return false
              }

              // make sure it

              return true
            })
            .map((k) => k.replace(/^\.\/?/, ''))
            .map((k) => `${dep}/${k}`)

          /**
           * A dirty workaround for packages that are using entry points that are not explicitly defined,
           * such as while using react-native-vector-icons, users will import Icon components like this: `import Icon from 'react-native-vector-icons/FontAwesome'`.
           */
          const specialExports = (() => {
            switch (dep) {
              case 'react-native-vector-icons':
                return [
                  'AntDesign',
                  'Entypo',
                  'EvilIcons',
                  'Feather',
                  'FontAwesome',
                  'FontAwesome5',
                  'FontAwesome5Pro',
                  'Fontisto',
                  'Foundation',
                  'Ionicons',
                  'MaterialCommunityIcons',
                  'MaterialIcons',
                  'Octicons',
                  'SimpleLineIcons',
                  'Zocial',
                ].map((n) => `${dep}/${n}`)

              default:
                return []
            }
          })()

          const mainExport = depPkgJson['main'] || depPkgJson['module'] || definedExports['.']

          const exports = [...definedExports, ...specialExports]
          if (mainExport) {
            if (await checkIfExportExists(join(dirname(depPkgJsonPath), mainExport))) {
              exports.unshift(dep)
            }
          }

          return exports
        })()

        const result = [...depsToPreBundle, ...subDeps.prebundleDeps]

        proceededDeps.set(dep, result)
        return result
      })
    )
  )
    .flat()
    .filter((dep, index, arr) => arr.indexOf(dep) === index)

  const hasNativewind = !!pkgJson.dependencies?.['nativewind']

  if ((hasNativewind || hasReanimated) && options === rootOptions) {
    if (hasReanimated)
      console.info(
        `[one] Enabled babel plugins: ${[hasReanimated ? 'Reanimated' : '', hasNativewind ? 'Nativewind' : ''].filter(Boolean).join(', ')}`
      )
  }

  return {
    prebundleDeps,
    hasReanimated,
    // only check if set in root, dont want to enable css mode too easily
    hasNativewind,
  }
}

// vite will fail if there's a main export but it actually doesn't exist
// this ensures we actually check using an algorithm similar to node/vite
// probably can find a better one that matches their more accurately
async function checkIfExportExists(pathIn: string) {
  const paths = [pathIn, ...(extname(pathIn) ? [] : [pathIn + '.js', pathIn + sep + 'index.js'])]
  for (const path of paths) {
    if (await FSExtra.pathExists(path)) {
      return true
    }
  }
  return false
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

/**
 * Given the `package.json` content of a package and a dependency name, check if the package has the dependency as a required dependency:
 * - If the dependency is in `dependencies`, it's a required dependency.
 * - If the dependency is in `peerDependencies` and is not marked as optional, it's a required dependency.
 */
function hasRequiredDep(pkgJson: Record<string, Record<string, any> | undefined>, depName: string) {
  return !!(
    pkgJson.dependencies?.[depName] ||
    (pkgJson.peerDependencies?.[depName] && !pkgJson.peerDependenciesMeta?.[depName]?.optional)
  )
}
