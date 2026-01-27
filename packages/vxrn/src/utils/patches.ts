import { transformSWC } from '@vxrn/compiler'
import { transformFlowBabel } from '@vxrn/vite-flow'
import findNodeModules from 'find-node-modules'
import FSExtra from 'fs-extra'
import { join } from 'node:path'
import { rename } from 'node:fs/promises'
import semver from 'semver'
import type { UserConfig } from 'vite'
import type { VXRNOptionsFilled } from '../config/getOptionsFilled'
import { deepMergeOptimizeDeps } from '../config/mergeUserConfig'
import { builtInDepPatches } from '../patches/builtInDepPatches'
import { globDir } from './globDir'

type Strategies = 'swc' | 'flow' | 'jsx'

export type DepOptimize = boolean | 'exclude' | 'interop'

export type DepFileStrategy =
  | ((contents?: string) => void | string | Promise<void | string>)
  | string
  | Strategies[]

export type DepPatch = {
  module: string
  patchFiles: { optimize?: DepOptimize; version?: string } & {
    [key: string]: DepFileStrategy
  }
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
  options: Pick<VXRNOptionsFilled, 'root'>,
  extraPatches?: SimpleDepPatchObject
) {
  const all = [...builtInDepPatches]

  // merge user patches on top of built ins
  if (extraPatches) {
    for (const key in extraPatches) {
      const extraPatchFiles = extraPatches[key]
      const existing = all.find((x) => x.module === key)
      if (existing) {
        for (const patchKey in extraPatchFiles) {
          if (existing.patchFiles[patchKey]) {
            console.warn(
              `Warning: Overwriting One built-in patch with user patch`,
              key,
              patchKey
            )
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

// stats file stores {[filePath]: {size, mtimeMs}} of patched files for fast comparison
type PatchStats = Record<string, { size: number; mtimeMs: number }>

const STATS_FILE = '.vxrn.patch-stats.json'

function getOriginalPath(fullPath: string) {
  return fullPath + '.vxrn.original'
}

async function readPatchStats(nodeModulesDir: string): Promise<PatchStats> {
  try {
    return await FSExtra.readJSON(join(nodeModulesDir, STATS_FILE))
  } catch {
    return {}
  }
}

async function writePatchStats(nodeModulesDir: string, stats: PatchStats) {
  await FSExtra.writeJSON(join(nodeModulesDir, STATS_FILE), stats)
}

type PatchResult = 'applied' | 'ok' | 'skipped'

export async function applyDependencyPatches(
  patches: DepPatch[],
  { root = process.cwd() }: { root?: string } = {}
) {
  const nodeModulesDirs = findNodeModules({ cwd: root }).map((relativePath) =>
    join(root, relativePath)
  )

  // track results per module
  const results = new Map<string, PatchResult>()

  await Promise.all(
    nodeModulesDirs.map(async (nodeModulesDir) => {
      // read stats file once per node_modules
      const patchStats = await readPatchStats(nodeModulesDir)
      let statsChanged = false

      await Promise.all(
        patches.map(async (patch) => {
          try {
            const nodeModuleDir = join(nodeModulesDir, patch.module)

            if (!FSExtra.existsSync(nodeModuleDir)) return

            const version = patch.patchFiles.version
            if (typeof version === 'string') {
              const pkgJSON = await FSExtra.readJSON(join(nodeModuleDir, 'package.json'))
              if (!semver.satisfies(pkgJSON.version, version)) return
            }

            // collect all files to patch
            const filePatches: {
              relativePath: string
              patchDefinition: DepFileStrategy
            }[] = []
            for (const file in patch.patchFiles) {
              if (file === 'optimize' || file === 'version') continue
              const filesToApply = file.includes('*')
                ? globDir(nodeModuleDir, file)
                : [file]
              for (const relativePath of filesToApply) {
                filePatches.push({
                  relativePath,
                  patchDefinition: patch.patchFiles[file],
                })
              }
            }

            // stat all target files in parallel for fast comparison
            const fileStatsResults = await Promise.all(
              filePatches.map(async ({ relativePath }) => {
                const fullPath = join(nodeModuleDir, relativePath)
                try {
                  const stat = await FSExtra.stat(fullPath)
                  return { relativePath, fullPath, stat, exists: true }
                } catch {
                  return { relativePath, fullPath, stat: null, exists: false }
                }
              })
            )

            // filter to files that need processing
            const filesToProcess = fileStatsResults.filter(
              ({ fullPath, stat, exists }) => {
                if (!exists || !stat) return false
                if (process.env.VXRN_FORCE_PATCH) return true

                const cached = patchStats[fullPath]
                if (!cached) return true // never patched

                // check if file changed since we patched it
                return stat.size !== cached.size || stat.mtimeMs !== cached.mtimeMs
              }
            )

            // if no files need processing, module is already patched
            if (filesToProcess.length === 0) {
              if (!results.has(patch.module)) {
                results.set(patch.module, 'ok')
              }
              return
            }

            let didApplyPatch = false

            // process files that need patching
            await Promise.all(
              filesToProcess.map(async ({ relativePath, fullPath }) => {
                try {
                  const patchDef = filePatches.find(
                    (p) => p.relativePath === relativePath
                  )!.patchDefinition
                  const originalPath = getOriginalPath(fullPath)

                  // read target and original in parallel
                  const [targetContent, originalContent] = await Promise.all([
                    FSExtra.readFile(fullPath, 'utf-8'),
                    FSExtra.readFile(originalPath, 'utf-8').catch(() => null),
                  ])

                  // determine source content for patching
                  const sourceContent = originalContent ?? targetContent

                  // apply patch
                  let patchedContent: string | null = null

                  if (typeof patchDef === 'string') {
                    patchedContent = patchDef
                  } else if (Array.isArray(patchDef)) {
                    let contents = sourceContent
                    for (const strategy of patchDef) {
                      if (strategy === 'flow') {
                        contents = await transformFlowBabel(contents)
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
                    if (contents !== sourceContent) {
                      patchedContent = contents
                    }
                  } else {
                    const out = await patchDef(sourceContent)
                    if (typeof out === 'string' && out !== sourceContent) {
                      patchedContent = out
                    }
                  }

                  // if patch produced changes
                  if (patchedContent !== null) {
                    // check if already has this patched content
                    if (targetContent === patchedContent) {
                      // already patched, just update stats
                      const stat = await FSExtra.stat(fullPath)
                      patchStats[fullPath] = { size: stat.size, mtimeMs: stat.mtimeMs }
                      statsChanged = true
                      return
                    }

                    // write original if needed, then write patched
                    await Promise.all([
                      originalContent === null &&
                        atomicWriteFile(originalPath, sourceContent),
                      atomicWriteFile(fullPath, patchedContent),
                    ])

                    // update stats
                    const stat = await FSExtra.stat(fullPath)
                    patchStats[fullPath] = { size: stat.size, mtimeMs: stat.mtimeMs }
                    statsChanged = true
                    didApplyPatch = true

                    if (process.env.DEBUG) {
                      console.info(
                        `  - Applied patch to ${patch.module}: ${relativePath}`
                      )
                    }
                  } else {
                    // patch made no changes, still record stats so we skip next time
                    const stat = await FSExtra.stat(fullPath)
                    patchStats[fullPath] = { size: stat.size, mtimeMs: stat.mtimeMs }
                    statsChanged = true
                  }
                } catch (err) {
                  if (err instanceof Bail) return
                  throw err
                }
              })
            )

            // update result for this module
            if (didApplyPatch) {
              results.set(patch.module, 'applied')
            } else if (!results.has(patch.module)) {
              results.set(patch.module, 'ok')
            }
          } catch (err) {
            console.error(`🚨 Error applying patch to`, patch.module)
            console.error(err)
          }
        })
      )

      // write stats file if changed
      if (statsChanged) {
        await writePatchStats(nodeModulesDir, patchStats)
      }
    })
  )

  // log results
  for (const [module, result] of results) {
    if (result === 'applied') {
      console.info(` 🩹 ${module}`)
    } else if (result === 'ok') {
      console.info(` ✓ ${module}`)
    }
  }
}

async function atomicWriteFile(filePath: string, contents: string) {
  const tempPath = filePath + '.vxrn.tmp.' + process.pid + '.' + Date.now()
  await FSExtra.writeFile(tempPath, contents)
  await rename(tempPath, filePath)
}
