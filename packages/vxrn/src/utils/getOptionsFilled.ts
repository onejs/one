import { getPort } from 'get-port-please'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { join } from 'node:path'
import { readPackageJSON } from 'pkg-types'
import type { VXRNOptions } from '../types'
import { readState, writeState } from './state'

const require = createRequire(import.meta.url)

export type VXRNOptionsFilled = Awaited<ReturnType<typeof getOptionsFilled>>

export async function getOptionsFilled(
  options: VXRNOptions,
  internal: { mode?: 'dev' | 'prod' } = { mode: 'dev' }
) {
  const { host = '127.0.0.1', root = process.cwd(), entries, https } = options

  const defaultPort = options.port || (internal.mode === 'dev' ? 8081 : 3000)
  const packageRootDir = join(require.resolve('vxrn'), '../..')
  const cacheDir = join(root, 'node_modules', '.vxrn')

  const [port, state, packageJSON] = await Promise.all([
    getPort({
      port: defaultPort,
      portRange: [defaultPort, defaultPort + 100],
      host: '127.0.0.1',
    }),
    readState(cacheDir),
    readPackageJSON(),
  ])

  const deps = packageJSON.dependencies || {}

  const packageVersions =
    deps.react && deps['react-native']
      ? {
          react: deps.react.replace(/[\^\~]/, ''),
          reactNative: deps['react-native'].replace(/[\^\~]/, ''),
        }
      : undefined

  const versionHash = hashString(JSON.stringify(packageJSON))
  const clean = Boolean(options.clean ?? (state.versionHash && state.versionHash !== versionHash))

  // no need to wait to write state
  void writeState(cacheDir, { versionHash })

  return {
    ...options,
    clean,
    protocol: https ? ('https:' as const) : ('http:' as const),
    entries: {
      native: './src/entry-native.tsx',
      server: './src/entry-server.tsx',
      ...entries,
    },
    packageJSON,
    packageVersions,
    state,
    packageRootDir,
    cacheDir,
    host,
    root,
    port,
  }
}

function hashString(str: string): string {
  const hash = createHash('sha256') // Create a hash object with the desired algorithm (e.g., 'sha256')
  hash.update(str) // Update the hash content with the input string
  return hash.digest('hex') // Output the final hash in hexadecimal format
}
