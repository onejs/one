import { transformFlow } from '@vxrn/vite-flow'
import { transformSWC } from '@vxrn/compiler'
import findNodeModules from 'find-node-modules'
import FSExtra from 'fs-extra'
import { join } from 'node:path'
import semver from 'semver'
import type { UserConfig } from 'vite'
import { depPatches } from './depPatches'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { globDir } from './globDir'
import { deepMergeOptimizeDeps } from './mergeUserConfig'

type Strategies = 'swc' | 'flow' | 'jsx'

export type DepOptimize = boolean | 'exclude' | 'interop'

export type DepFileStrategy =
  | ((contents?: string) => void | string | Promise<void | string>)
  | string
  | Strategies[]

export type DepPatch = {
  module: string
  patchFiles: { optimize?: DepOptimize; version?: string } & { [key: string]: DepFileStrategy }
}

class Bail extends Error {}

export function bailIfUnchanged(obj1: any, obj2: any) {
  if (JSON.stringify(obj1) === JSON.stringify(obj2)) {
    throw new Bail()
  }
}

export function bailIfExists(haystack: string, needle: string) {
  if (haystack.includes(needle)) {
    throw new Bail()
  }
}

export type SimpleDepPatchObject = Record<string, DepPatch['patchFiles']>

export async function applyBuiltInPatches(
  options: VXRNOptionsFilled,
  extraPatches?: SimpleDepPatchObject
) {
  const all = [...depPatches]

  // merge user patches on top of built ins
  if (extraPatches) {
    for (const key in extraPatches) {
      const extraPatchFiles = extraPatches[key]
      const existing = all.find((x) => x.module === key)
      if (existing) {
        for (const patchKey in extraPatchFiles) {
          if (existing.patchFiles[patchKey]) {
            console.warn(`Warning: Overwriting One built-in patch with user patch`, key, patchKey)
          }
          existing.patchFiles[patchKey] = extraPatchFiles[patchKey]
        }
      } else {
        all.push({ module: key, patchFiles: extraPatchFiles })
      }
    }
  }

  await applyDependencyPatches(all, { root: options.root })
}

export async function applyOptimizePatches(patches: DepPatch[], config: UserConfig) {
  const optimizeDeps = {
    include: [] as string[],
    exclude: [] as string[],
    needsInterop: [] as string[],
  } satisfies Partial<UserConfig['optimizeDeps']>

  patches.forEach((patch) => {
    // apply non-file-specific optimizations:
    const optimize = patch.patchFiles.optimize
    if (typeof optimize !== 'undefined') {
      if (optimize === true) {
        optimizeDeps.include.push(patch.module)
      } else if (optimize === false || optimize === 'exclude') {
        if (optimizeDeps?.include) {
          optimizeDeps.include = optimizeDeps.include.filter((x) => x !== patch.module)
        }
        optimizeDeps.exclude.push(patch.module)
      } else if (optimize === 'interop') {
        optimizeDeps?.include?.push(patch.module)
        optimizeDeps?.needsInterop?.push(patch.module)
      }
    }
  })

  deepMergeOptimizeDeps(config, { optimizeDeps }, undefined, true)
  deepMergeOptimizeDeps(config.ssr!, { optimizeDeps }, undefined, true)
}

export async function applyDependencyPatches(
  patches: DepPatch[],
  { root = process.cwd() }: { root?: string } = {}
) {
  /**
   * We need this to be cached not only for performance but also for the
   * fact that we may patch the same file multiple times but the "ogfile"
   * will be created during the first patching.
   */
  const isAlreadyPatchedMap = createCachingMap((fullFilePath: string) =>
    FSExtra.existsSync(getOgFilePath(fullFilePath))
  )
  /**
   * A set of full paths to files that have been patched during the
   * current run.
   */
  const pathsBeingPatched = new Set<string>()

  const nodeModulesDirs = findNodeModules({
    cwd: root,
  }).map((relativePath) => join(root, relativePath))

  await Promise.all(
    patches.flatMap((patch) => {
      return nodeModulesDirs!.flatMap(async (dir) => {
        try {
          const nodeModuleDir = join(dir, patch.module)
          const version = patch.patchFiles.version

          let hasLogged = false

          if (FSExtra.existsSync(nodeModuleDir)) {
            if (typeof version === 'string') {
              const pkgJSON = await FSExtra.readJSON(join(nodeModuleDir, 'package.json'))
              if (!semver.satisfies(pkgJSON.version, version)) {
                return
              }
            }

            for (const file in patch.patchFiles) {
              if (file === 'optimize' || file === 'version') {
                continue
              }

              const filesToApply = file.includes('*') ? globDir(nodeModuleDir, file) : [file]

              await Promise.all(
                filesToApply.map(async (relativePath) => {
                  try {
                    const fullPath = join(nodeModuleDir, relativePath)

                    if (!process.env.VXRN_FORCE_PATCH && isAlreadyPatchedMap.get(fullPath)) {
                      // if the file is already patched, skip it
                      return
                    }

                    let contentsIn = await (async () => {
                      if (pathsBeingPatched.has(fullPath)) {
                        // If the file has been patched during the current run,
                        // we should always start from the already patched file
                        return await FSExtra.readFile(fullPath, 'utf-8')
                      }

                      if (isAlreadyPatchedMap.get(fullPath)) {
                        // If a original file exists, we should start from it
                        // If we can reach here, basically it means
                        // VXRN_FORCE_PATCH is set
                        return await FSExtra.readFile(getOgFilePath(fullPath), 'utf-8')
                      }

                      return await FSExtra.readFile(fullPath, 'utf-8')
                    })()

                    const write = async (contents: string) => {
                      const possibleOrigContents = contentsIn
                      // update contentsIn so the next patch gets the new value if it runs multiple
                      contentsIn = contents
                      const alreadyPatchedPreviouslyInCurrentRun = pathsBeingPatched.has(fullPath)
                      pathsBeingPatched.add(fullPath)
                      await Promise.all(
                        [
                          !alreadyPatchedPreviouslyInCurrentRun /* only write ogfile if this is the first patch, otherwise contentsIn will be already patched content */ &&
                            !isAlreadyPatchedMap.get(
                              fullPath
                            ) /* an ogfile must already be there, no need to write */ &&
                            FSExtra.writeFile(getOgFilePath(fullPath), possibleOrigContents),
                          FSExtra.writeFile(fullPath, contents),
                        ].filter((p) => !!p)
                      )

                      if (!hasLogged) {
                        hasLogged = true
                        console.info(` 🩹 Patching ${patch.module}`)
                      }

                      if (process.env.DEBUG) {
                        console.info(`  - Applied patch to ${patch.module}: ${relativePath}`)
                      }
                    }

                    const patchDefinition = patch.patchFiles[file]

                    // add
                    if (typeof patchDefinition === 'string') {
                      await write(patchDefinition)
                      return
                    }

                    // strategy
                    if (Array.isArray(patchDefinition)) {
                      let contents = contentsIn

                      for (const strategy of patchDefinition) {
                        if (strategy === 'flow') {
                          contents = await transformFlow(contents)
                        }
                        if (strategy === 'swc' || strategy === 'jsx') {
                          contents =
                            (
                              await transformSWC(fullPath, contents, {
                                mode: 'build',
                                environment: 'ios',
                                forceJSX: strategy === 'jsx',
                                noHMR: true,
                                fixNonTypeSpecificImports: true,
                              })
                            )?.code || contents
                        }
                      }

                      if (contentsIn !== contents) {
                        await write(contents)
                      }

                      return
                    }

                    // update
                    const out = await patchDefinition(contentsIn)
                    if (typeof out === 'string') {
                      await write(out)
                    }
                  } catch (err) {
                    if (err instanceof Bail) {
                      return
                    }
                    throw err
                  }
                })
              )
            }
          }
        } catch (err) {
          console.error(`🚨 Error applying patch to`, patch.module)
          console.error(err)
        }
      })
    })
  )
}

/**
 * For every patch we store an "og" file as a backup of the original.
 * If such file exists, we can skip the patching since the
 * file should be already patched, unless the user forces
 * to apply the patch again - in such case we use the
 * contents of the original file as a base to reapply patches.
 */
function getOgFilePath(fullPath: string) {
  return fullPath + '.vxrn.ogfile'
}

/**
 * Creates a caching map that uses a getter function to retrieve values.
 * If the value for a key is not present, it calls the getter and caches the result.
 */
function createCachingMap(getter) {
  const map = new Map()

  return new Proxy(map, {
    get(target, prop, receiver) {
      if (prop === 'get') {
        return (key) => {
          if (target.has(key)) {
            return target.get(key)
          }
          const value = getter(key)
          target.set(key, value)
          return value
        }
      }

      return Reflect.get(target, prop, receiver)
    },
  })
}
