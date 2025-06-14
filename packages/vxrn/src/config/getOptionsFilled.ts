import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPackageJSON } from 'pkg-types'
import type { Mode, VXRNOptions } from '../types'
import { getServerOptionsFilled } from './getServerOptionsFilled'
import { readState, writeState } from '../utils/state'

const require = createRequire(import.meta.url)

export type VXRNOptionsFilled = Awaited<ReturnType<typeof fillOptions>>

let optionsFilled: VXRNOptionsFilled | null = null

export async function fillOptions(options: VXRNOptions, { mode = 'dev' }: { mode?: Mode } = {}) {
  const { root = process.cwd(), entries } = options

  const devMode = options.mode === 'production' ? false : mode === 'dev'

  if (!devMode) {
    console.info(`❶ Running dev server in production mode`)
  }

  const packageRootDir = join(require.resolve('vxrn'), '../..')
  const cacheDir = join(root, 'node_modules', '.vxrn')

  const [state, packageJSON] = await Promise.all([readState(cacheDir), readPackageJSON()])

  const deps = packageJSON.dependencies || {}

  const packageVersions =
    deps.react && deps['react-native']
      ? {
          react: deps.react.replace(/[\^\~]/, ''),
          reactNative: deps['react-native'].replace(/[\^\~]/, ''),
        }
      : undefined

  const versionHash = hashString(JSON.stringify(packageJSON))
  const clean =
    (options.clean ?? (state.versionHash && state.versionHash !== versionHash)) ? 'vite' : false

  // no need to wait to write state
  void writeState(cacheDir, { versionHash })

  if (typeof options.build?.server !== 'boolean' && !options.build?.server) {
    // default building server to off
    options.build ||= {}
    options.build.server = false
  }

  const debugBundlePath =
    options.debugBundle && typeof options.debugBundle === 'string'
      ? options.debugBundle
      : join(tmpdir(), `bundle-${Math.round(Math.random() * 100_000)}.js`)

  const final = {
    ...options,
    // for now just allow debugging one at once
    debugBundlePaths: {
      ios: debugBundlePath,
      android: debugBundlePath,
    },
    mode: devMode ? ('development' as const) : ('production' as const),
    clean,
    root,
    server: await getServerOptionsFilled(options.server, mode),
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
  } as const

  optionsFilled = final

  return final
}

export function getOptionsFilled() {
  return optionsFilled
}

function hashString(str: string): string {
  const hash = createHash('sha256') // Create a hash object with the desired algorithm (e.g., 'sha256')
  hash.update(str) // Update the hash content with the input string
  return hash.digest('hex') // Output the final hash in hexadecimal format
}
