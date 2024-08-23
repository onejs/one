import findNodeModules from 'find-node-modules'
import { join } from 'node:path'
import FSExtra from 'fs-extra'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { depPatches } from './depPatches'

export type DepPatch = {
  module: string
  patchFiles: {
    [key: string]:
      | ((contents?: string) => string | Promise<string>)
      | {
          add: string
        }
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

  const logged = {}

  await Promise.all(
    patches.flatMap((patch) => {
      return nodeModulesDirs.flatMap(async (dir) => {
        const nodeModuleDir = join(dir, patch.module)

        if (await FSExtra.pathExists(nodeModuleDir)) {
          for (const file in patch.patchFiles) {
            const log = () => {
              if (logged[patch.module]) return
              logged[patch.module] = true
              console.info(` Applying patch to ${patch.module}`)
            }

            try {
              const fullPath = join(nodeModuleDir, file)
              const patchDefinition = patch.patchFiles[file]

              // create
              if (typeof patchDefinition === 'object') {
                if (patchDefinition.add) {
                  if (!(await FSExtra.pathExists(fullPath))) {
                    log()
                    await FSExtra.writeFile(fullPath, patchDefinition.add)
                    continue
                  }
                }

                continue
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
          }
        }
      })
    })
  )
}
