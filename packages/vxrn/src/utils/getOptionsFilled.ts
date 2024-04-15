import { join } from 'node:path'
import { readPackageJSON } from 'pkg-types'
import { createRequire } from 'module'
import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'

const require = createRequire(import.meta.url)

export type VXRNConfigFilled = Awaited<ReturnType<typeof getOptionsFilled>>

export async function getOptionsFilled(options: VXRNConfig) {
  const { host = '127.0.0.1', root = process.cwd(), port = 8081 } = options
  
  const packageRootDir = join(require.resolve('vxrn'), '../../..')

  const cacheDir = join(root, 'node_modules', '.cache', 'vxrn')
  const internalPatchesDir = join(packageRootDir, 'patches')
  const userPatchesDir = join(root, 'patches')
  const [state, packageJSON] = await Promise.all([
    //
    readState(cacheDir),
    readPackageJSON(),
  ])
  return {
    ...options,
    packageJSON,
    state,
    packageRootDir,
    cacheDir,
    userPatchesDir,
    internalPatchesDir,
    host,
    root,
    port,
  }
}

type State = {
  applyPatches?: boolean
}

async function readState(cacheDir: string) {
  const statePath = join(cacheDir, 'state.json')
  const state: State = (await FSExtra.pathExists(statePath))
    ? await FSExtra.readJSON(statePath)
    : {}
  return state
}
