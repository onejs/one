import { transformSWC } from '@vxrn/compiler'
import { transformFlowBabel } from '@vxrn/vite-flow'
import Glob from 'fast-glob'
import { existsSync, realpathSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { readFile, rename, stat, writeFile } from 'node:fs/promises'
import semver from 'semver'
import { builtInDepPatches } from '../patches/builtInDepPatches'
import { readJSON, writeJSON } from './fs'
import { globDir } from './globDir'

// every node_modules dir from root up to the filesystem root,
// matching the find-node-modules lookup this replaces
function findNodeModulesDirs(root: string): string[] {
  const dirs: string[] = []
  let dir = resolve(root)
  for (;;) {
    const candidate = join(dir, 'node_modules')
    if (existsSync(candidate)) dirs.push(candidate)
    const parent = dirname(dir)
    if (parent === dir) return dirs
    dir = parent
  }
}

type Strategies = 'swc' | 'flow' | 'jsx'

export type DepFileStrategy =
  | ((contents?: string) => void | string | Promise<void | string>)
  | string
  | Strategies[]

export type DepPatch = {
  module: string
  patchFiles: { version?: string } & {
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

// false skips every built-in patch; a module set to false skips its built-in patch
export type UserDepPatches = false | Record<string, DepPatch['patchFiles'] | false>

export async function applyBuiltInPatches({
  root,
  patches,
}: {
  root: string
  patches?: UserDepPatches
}) {
  if (patches === false) return

  const all: DepPatch[] = builtInDepPatches
    .filter((x) => patches?.[x.module] !== false)
    .map((x) => ({ module: x.module, patchFiles: { ...x.patchFiles } }))

  // merge user patches on top of built ins
  for (const key in patches) {
    const extraPatchFiles = patches[key]
    if (extraPatchFiles === false) continue
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

  await applyDependencyPatches(all, { root })
}

// stats file stores {[filePath]: {size, mtimeMs}} of patched files for fast comparison
type PatchStats = Record<string, { size: number; mtimeMs: number }>

const STATS_FILE = '.vxrn.patch-stats.json'

function getOriginalPath(fullPath: string) {
  return fullPath + '.vxrn.original'
}

async function readPatchStats(nodeModulesDir: string): Promise<PatchStats> {
  try {
    return await readJSON(join(nodeModulesDir, STATS_FILE))
  } catch {
    return {}
  }
}

async function writePatchStats(nodeModulesDir: string, stats: PatchStats) {
  await writeJSON(join(nodeModulesDir, STATS_FILE), stats)
}

type PatchResult = 'applied' | 'ok' | 'skipped'

/**
 * Convert a module name to a pnpm content-addressable store glob pattern.
 * Scoped packages: @scope/name -> @scope+name
 * Unscoped packages pass through unchanged.
 */
export function moduleToPnpmStorePattern(moduleName: string): string {
  return moduleName.replace('/', '+')
}

export async function applyDependencyPatches(
  patches: DepPatch[],
  { root = process.cwd() }: { root?: string } = {}
) {
  // collect unique module names for pnpm store globbing
  const patchModuleNames = [...new Set(patches.map((p) => p.module))]

  const nodeModulesDirs = findNodeModulesDirs(root).flatMap((dir) => {
    const dirs = [dir]

    const pnpmBase = join(dir, '.pnpm')
    if (!existsSync(pnpmBase)) return dirs

    // pnpm hoists transitive deps into .pnpm/node_modules/ (symlinks to store)
    const pnpmHoistedDir = join(pnpmBase, 'node_modules')
    if (existsSync(pnpmHoistedDir)) {
      dirs.push(pnpmHoistedDir)
    }

    // pnpm content-addressable store: scan for store entries matching our patch modules
    // handles cases where packages aren't hoisted (strict mode, peer dep conflicts, hoist=false)
    for (const moduleName of patchModuleNames) {
      const storePattern = moduleToPnpmStorePattern(moduleName)
      const storeMatches = Glob.sync(`${storePattern}@*/node_modules`, {
        cwd: pnpmBase,
        onlyDirectories: true,
      })
      for (const match of storeMatches) {
        dirs.push(join(pnpmBase, match))
      }
    }

    return dirs
  })

  // track results per module
  const results = new Map<string, PatchResult>()
  // track modules that already warned about transform failures (to avoid spam)
  const transformWarnedModules = new Set<string>()
  // track real paths per (patch index, real dir) to prevent double-patching
  // when symlinks and store entries resolve to the same physical files
  const patchedRealPaths = new Set<string>()

  await Promise.all(
    nodeModulesDirs.map(async (nodeModulesDir) => {
      // read stats file once per node_modules
      const patchStats = await readPatchStats(nodeModulesDir)
      let statsChanged = false

      await Promise.all(
        patches.map(async (patch) => {
          try {
            const nodeModuleDir = join(nodeModulesDir, patch.module)

            if (!existsSync(nodeModuleDir)) return

            // deduplicate by real path to avoid patching the same files twice
            // (multiple symlinks/paths can resolve to the same pnpm store entry)
            let realModuleDir: string
            try {
              realModuleDir = realpathSync(nodeModuleDir)
            } catch {
              return
            }
            const patchIdx = patches.indexOf(patch)
            const dedupKey = `${patchIdx}\0${realModuleDir}`
            if (patchedRealPaths.has(dedupKey)) return
            patchedRealPaths.add(dedupKey)

            const version = patch.patchFiles.version
            if (typeof version === 'string') {
              const pkgJSON = await readJSON(join(nodeModuleDir, 'package.json'))
              if (!semver.satisfies(pkgJSON.version, version)) return
            }

            // collect all files to patch
            const filePatches: {
              relativePath: string
              patchDefinition: DepFileStrategy
            }[] = []
            for (const file in patch.patchFiles) {
              if (file === 'version') continue
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
                  const fileStat = await stat(fullPath)
                  return { relativePath, fullPath, stat: fileStat, exists: true }
                } catch {
                  return { relativePath, fullPath, stat: null, exists: false }
                }
              })
            )

            // filter to files that need processing
            const filesToProcess = fileStatsResults.filter(
              ({ fullPath, stat: fileStat, exists }) => {
                if (!exists || !fileStat) return false
                if (process.env.VXRN_FORCE_PATCH) return true

                const cached = patchStats[fullPath]
                if (!cached) return true // never patched

                // check if file changed since we patched it
                return fileStat.size !== cached.size || fileStat.mtimeMs !== cached.mtimeMs
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
                    readFile(fullPath, 'utf-8'),
                    readFile(originalPath, 'utf-8').catch(() => null),
                  ])

                  // determine source content for patching
                  const sourceContent = originalContent ?? targetContent

                  // apply patch
                  let patchedContent: string | null = null

                  if (typeof patchDef === 'string') {
                    patchedContent = patchDef
                  } else if (Array.isArray(patchDef)) {
                    // strategy-array patches (flow/jsx/swc transforms) are non-critical
                    // if they fail, warn and skip rather than crashing the whole patch
                    // process. the message carries the real error: a skipped Flow strip
                    // here leaves raw Flow in node_modules, and the only sign of it used
                    // to be a bundler parse failure several steps later.
                    try {
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
                                // a patch is written to node_modules ONCE and then read by
                                // every later build, dev and production alike, so its output
                                // has to be valid in both. the automatic JSX runtime is not:
                                // its dev form emits `jsxDEV` from react/jsx-dev-runtime, and
                                // React's production build exports `jsxDEV = void 0`, so a
                                // patched dependency that renders JSX throws "undefined is not
                                // a function" from render in any production bundle. `jsx`/`jsxs`
                                // work in both builds, and refresh is already off for
                                // node_modules, so the stable runtime is the only correct output.
                                production: true,
                              })
                            )?.code || contents
                        }
                      }
                      if (contents !== sourceContent) {
                        patchedContent = contents
                      }
                    } catch (transformErr) {
                      if (!transformWarnedModules.has(patch.module)) {
                        transformWarnedModules.add(patch.module)
                        console.warn(
                          `  ⚠ Patch transform failed for ${patch.module} in ${relativePath}, skipping non-critical patch: ${
                            (transformErr as Error)?.stack ?? transformErr
                          }`
                        )
                      }
                      return
                    }
                  } else {
                    const out = await patchDef(sourceContent)
                    if (typeof out === 'string' && out !== sourceContent) {
                      patchedContent = out
                    } else if (typeof out === 'string') {
                      // the patch ran and changed nothing. these patches are
                      // literal string replaces against upstream source, so
                      // that means the code it targets moved or was rewritten
                      // and the patch is now a no-op. silence here is
                      // dangerous: react-native's RCTTurboModule.mm patch
                      // guards an ios SIGSEGV, and it stopped matching on RN
                      // 0.86 without a word, which only turned up because
                      // someone read the patch by hand during an upgrade.
                      //
                      // a patch that doesn't apply says so by returning
                      // undefined (`if (contents.includes(x)) return`), so a
                      // returned string that equals its input is always a stale
                      // patch, never an intentional skip.
                      console.warn(
                        `[vxrn] patch for ${patch.module} matched nothing in ${relativePath} — it is stale and is no longer protecting anything`
                      )
                    }
                  }

                  // if patch produced changes
                  if (patchedContent !== null) {
                    // check if already has this patched content
                    if (targetContent === patchedContent) {
                      // already patched, just update stats
                      const fileStat = await stat(fullPath)
                      patchStats[fullPath] = { size: fileStat.size, mtimeMs: fileStat.mtimeMs }
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
                    const fileStat = await stat(fullPath)
                    patchStats[fullPath] = { size: fileStat.size, mtimeMs: fileStat.mtimeMs }
                    statsChanged = true
                    didApplyPatch = true

                    if (process.env.DEBUG) {
                      console.info(
                        `  - Applied patch to ${patch.module}: ${relativePath}`
                      )
                    }
                  } else {
                    // patch made no changes, still record stats so we skip next time
                    const fileStat = await stat(fullPath)
                    patchStats[fullPath] = { size: fileStat.size, mtimeMs: fileStat.mtimeMs }
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

  // log results (only log 'ok' status when --force is used)
  for (const [module, result] of results) {
    if (result === 'applied') {
      console.info(` 🩹 ${module}`)
    } else if (result === 'ok' && process.env.VXRN_FORCE_PATCH) {
      console.info(` ✓ ${module}`)
    }
  }
}

async function atomicWriteFile(filePath: string, contents: string) {
  const tempPath = filePath + '.vxrn.tmp.' + process.pid + '.' + Date.now()
  await writeFile(tempPath, contents)
  await rename(tempPath, filePath)
}
