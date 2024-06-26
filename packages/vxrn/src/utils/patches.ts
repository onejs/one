import findNodeModules from 'find-node-modules'
import { join } from 'node:path'
import FSExtra from 'fs-extra'
import type { VXRNOptionsFilled } from './getOptionsFilled'

const patches = [
  {
    module: 'react-native-screens',
    patchFile: 'react-native-screens+3.22.1.patch',
  },
]
type Patch = (typeof patches)[0]

export async function checkPatches(options: VXRNOptionsFilled) {
  if (options.state.applyPatches === false) {
    return
  }

  const nodeModulesDirs = findNodeModules({
    cwd: options.root,
  }).map((relativePath) => join(options.root, relativePath))

  const patchesToCopy = new Set<Patch>()

  await Promise.all(
    patches.flatMap((patch) => {
      return nodeModulesDirs.flatMap(async (dir) => {
        if (await FSExtra.pathExists(join(dir, patch.module))) {
          patchesToCopy.add(patch)
        }
      })
    })
  )

  let didCopy = false

  for (const patch of [...patchesToCopy]) {
    const dest = join(options.userPatchesDir, patch.patchFile)
    if (!(await FSExtra.pathExists(dest))) {
      didCopy = true
      console.info(`Copying patch ${patch.module}`)
      const src = join(options.internalPatchesDir, patch.patchFile)
      await FSExtra.copy(src, dest)
    }
  }

  if (didCopy) {
    console.info(
      `\nPlease restart after applying the patch by running "npx patch-package".
  Ideally add it to your devDependencies and as a postinstall script.\n`
    )
    process.exit(0)
  }
}
