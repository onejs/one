import { transformFlow } from '@vxrn/vite-flow'
import findNodeModules from 'find-node-modules'
import FSExtra from 'fs-extra'
import { join } from 'node:path'
import { depPatches } from './depPatches'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { globDir } from './globDir'
import { swcTransform } from '@vxrn/vite-native-swc'

type Strategies = 'swc' | 'flow' | 'jsx'

export type DepPatch = {
  module: string
  patchFiles: {
    [key: string]:
      | ((contents?: string) => void | string | Promise<void | string>)
      | {
          add: string
        }
      | Strategies[]
  }
}

class Bail extends Error {}

export function bailIfExists(haystack: string, needle: string) {
  if (haystack.includes(needle)) {
    throw new Bail()
  }
}

export async function applyBuiltInPatches(options: VXRNOptionsFilled) {
  if (options.state.applyPatches === false) {
    return
  }
  await applyPatches(depPatches, options.root)
}

export async function applyPatches(patches: DepPatch[], root = process.cwd()) {
  const nodeModulesDirs = findNodeModules({
    cwd: root,
  }).map((relativePath) => join(root, relativePath))

  await Promise.all(
    patches.flatMap((patch) => {
      return nodeModulesDirs.flatMap(async (dir) => {
        const nodeModuleDir = join(dir, patch.module)

        let hasLogged = false

        if (await FSExtra.pathExists(nodeModuleDir)) {
          for (const file in patch.patchFiles) {
            const filesToApply = file.includes('*') ? globDir(nodeModuleDir, file) : [file]

            await Promise.all(
              filesToApply.map(async (relativePath) => {
                try {
                  const fullPath = join(nodeModuleDir, relativePath)
                  const ogFile = fullPath + '.vxrn.ogfile'

                  // for any update we store an "og" file to compare and decide if we need to run again
                  const existingPatch = (await FSExtra.pathExists(ogFile))
                    ? await FSExtra.readFile(ogFile, 'utf-8')
                    : null

                  let contentsIn = (await FSExtra.pathExists(fullPath))
                    ? await FSExtra.readFile(fullPath, 'utf-8')
                    : ''

                  if (typeof existingPatch === 'string') {
                    if (!process.env.VXRN_FORCE_PATCH) {
                      return
                    }

                    // start from the OG
                    contentsIn = existingPatch
                  }

                  const write = async (contents: string) => {
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

                  if (!Array.isArray(patchDefinition) && typeof patchDefinition === 'object') {
                    // add
                    if (patchDefinition.add) {
                      await write(patchDefinition.add)
                    }
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
                            await swcTransform(fullPath, contents, {
                              mode: 'build',
                              forceJSX: strategy === 'jsx',
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
                  console.error(`Error applying patch to ${patch.module} ${relativePath}: ${err}`)
                }
              })
            )
          }
        }
      })
    })
  )
}
