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
              const appliedContents = new Map<string, string>()

              await Promise.all(
                filesToApply.map(async (relativePath) => {
                  try {
                    const fullPath = join(nodeModuleDir, relativePath)
                    const ogFile = fullPath + '.vxrn.ogfile'

                    // for any update we store an "og" file to compare and decide if we need to run again
                    let existingPatch: string | null = appliedContents.get(ogFile) || null

                    if (!existingPatch) {
                      if (!process.env.VXRN_FORCE_PATCH) {
                        if (FSExtra.existsSync(ogFile)) {
                          try {
                            // for some reason with bun install this would say it exists? but then fail here?
                            existingPatch = await FSExtra.readFile(ogFile, 'utf-8')
                          } catch (err) {
                            console.warn(`Error reading patch`, err)
                          }
                        }
                      }
                    }

                    let contentsIn =
                      existingPatch ||
                      (FSExtra.existsSync(fullPath)
                        ? await FSExtra.readFile(fullPath, 'utf-8')
                        : '')

                    const write = async (contents: string) => {
                      // update contentsIn so the next patch gets the new value if it runs multiple
                      contentsIn = contents
                      appliedContents.set(ogFile, contents)
                      await Promise.all([
                        FSExtra.writeFile(ogFile, contentsIn),
                        FSExtra.writeFile(fullPath, contents),
                      ])

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

              appliedContents.clear()
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
