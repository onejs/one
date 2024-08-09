import findNodeModules from 'find-node-modules'
import { join } from 'node:path'
import FSExtra from 'fs-extra'
import type { VXRNOptionsFilled } from './getOptionsFilled'

const patches = [
  {
    module: 'h3',
    patchFile: 'h3+1.11.1.patch',
  },
  {
    module: 'react',
    patchFile: 'react+18.3.1.patch',
  },
  {
    module: 'react-dom',
    patchFile: 'react-dom+18.3.1.patch',
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

  const patchesToCopy: { patch: Patch; dir: string }[] = []

  await Promise.all(
    patches.flatMap((patch) => {
      return nodeModulesDirs.flatMap(async (dir) => {
        if (await FSExtra.pathExists(join(dir, patch.module))) {
          patchesToCopy.push({ patch, dir })
        }
      })
    })
  )

  let didCopy = false

  for (const { patch, dir } of patchesToCopy) {
    const patchesDir = join(dir, '..', 'patches')

    if (!(await FSExtra.pathExists(patchesDir))) {
      await FSExtra.mkdir(patchesDir)
    }

    const src = join(options.internalPatchesDir, patch.patchFile)
    const dest = join(patchesDir, patch.patchFile)
    const patchContents = await FSExtra.readFile(src, 'utf-8')

    if (
      !(await FSExtra.pathExists(dest)) ||
      (await FSExtra.readFile(dest, 'utf-8')) !== patchContents
    ) {
      didCopy = true
      console.info(` 🩹 Adding patch ${patch.module}`)
      await FSExtra.copy(src, dest)
    }
  }

  if (didCopy) {
    console.info(
      `\nWe've added patches to support running React 19 and 18 in parallel. Please run "npx patch-package" and re-run.
  
      You'll want to add "patch-package" to your devDependencies and scripts.postinstall in your package.json.\n`
    )
    process.exit(0)
  }
}
