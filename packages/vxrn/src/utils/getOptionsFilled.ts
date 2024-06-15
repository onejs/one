import { join } from 'node:path'
import { readPackageJSON } from 'pkg-types'
import { createRequire } from 'node:module'
import FSExtra from 'fs-extra'
import type { VXRNConfig } from '../types'
import { getPort } from 'get-port-please'

const require = createRequire(import.meta.url)

export type VXRNConfigFilled = Awaited<ReturnType<typeof getOptionsFilled>>

export async function getOptionsFilled(
  options: VXRNConfig,
  internal: { mode?: 'dev' | 'prod' } = { mode: 'dev' }
) {
  const { host = '127.0.0.1', root = process.cwd(), entries, https } = options

  const defaultPort = options.port || (internal.mode === 'dev' ? 8081 : 3000)

  const port = await getPort({
    port: defaultPort,
    portRange: [defaultPort, defaultPort + 100],
    host: '127.0.0.1',
  })

  const packageRootDir = join(require.resolve('vxrn'), '../../..')
  const cacheDir = join(root, 'node_modules', '.vxrn')
  const internalPatchesDir = join(packageRootDir, 'patches')
  const userPatchesDir = join(root, 'patches')
  const [state, packageJSON] = await Promise.all([
    //
    readState(cacheDir),
    readPackageJSON(),
  ])
  return {
    ...options,
    protocol: https ? ('https:' as const) : ('http:' as const),
    entries: {
      native: './src/entry-native.tsx',
      server: './src/entry-server.tsx',
      ...entries,
    },
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
