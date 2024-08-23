import { transformFlow } from '@vxrn/vite-flow'
import findNodeModules from 'find-node-modules'
import FSExtra from 'fs-extra'
import { join } from 'node:path'
import { depPatches } from './depPatches'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { globDir } from './globDir'
import { swcTransform } from '@vxrn/vite-native-swc'

type Strategies = 'swc' | 'flow'

export type DepPatch = {
  module: string
  patchFiles: {
    [key: string]:
      | ((contents?: string) => string | Promise<string>)
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

        if (await FSExtra.pathExists(nodeModuleDir)) {
          for (const file in patch.patchFiles) {
            const filesToApply = file.includes('*') ? globDir(nodeModuleDir) : [file]

            await Promise.all(
              filesToApply.map(async (relativePath) => {
                const log = () => {
                  console.info(` 🩹 Applied patch to ${relativePath}`)
                }

                try {
                  const fullPath = join(nodeModuleDir, relativePath)
                  const patchDefinition = patch.patchFiles[file]

                  // strategy
                  if (Array.isArray(patchDefinition)) {
                    const contentsIn = await FSExtra.readFile(fullPath, 'utf-8')
                    let contents = contentsIn

                    for (const strategy of patchDefinition) {
                      if (strategy === 'flow') {
                        contents = await transformFlow(contents)
                      }
                      if (strategy === 'swc') {
                        contents =
                          (
                            await swcTransform(fullPath, contents, {
                              mode: 'build',
                            })
                          )?.code || contents
                      }
                    }

                    if (contentsIn !== contents) {
                      log()
                      await FSExtra.writeFile(fullPath, contents)
                    }

                    return
                  }

                  // create
                  if (typeof patchDefinition === 'object') {
                    if (patchDefinition.add) {
                      if (!(await FSExtra.pathExists(fullPath))) {
                        log()
                        await FSExtra.writeFile(fullPath, patchDefinition.add)
                        return
                      }
                    }

                    return
                  }

                  // update
                  log()
                  await FSExtra.writeFile(
                    fullPath,
                    await patchDefinition(await FSExtra.readFile(fullPath, 'utf-8'))
                  )
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
      })
    })
  )
}
