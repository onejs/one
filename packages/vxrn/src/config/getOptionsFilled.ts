import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPackageJSON } from 'pkg-types'
import type { Mode, VXRNOptions } from '../types'
import { getServerOptionsFilled } from './getServerOptionsFilled'
import { readState, writeState } from '../utils/state'
import { getCacheDir } from '../utils/getCacheDir'

const require = createRequire(import.meta.url)

/**
 * **NOTES**
 *
 * * Currently, the `VXRNOptionsFilled` type (which initially is the bag of
 *   command line arguments (`optionsIn`) filled with defaults)
 *   is used throughout the codebase. This makes it difficult to turn `vxrn`
 *   into a pure Vite plugin, because without using the vxrn CLI there will be
 *   no `VXRNOptionsFilled`.
 * * So we plan to gradually phase out `VXRNOptionsFilled`.
 * * The content of `VXRNOptionsFilled` can be divide into two types:
 *   1. Values that can be derived from the Vite config object.
 *   2. Optional settings that are rarely needed.
 *   * For type 1, we will just derive them from the Vite config object. We can
 *     create helper functions like `getSomething(config: ViteResolvedConfig)`
 *     and reuse them across sub-plugins or functions.
 *   * For type 2, we'll avoid referencing VXRNOptionsFilled entirely and
 *     instead pass individual options with sensible defaults.
 * * Current transition strategy:
 *   * To maintain backward compatibility and avoid large-scale refactors at
 *     once, we will still leave most of the `VXRNOptionsFilled` usages there.
 *   * However, we should avoid depending on the full `VXRNOptionsFilled` type.
 *     Instead, we'll use `Pick<...>` and/or `Partial<...>` to narrow the type
 *     to only the properties actually used by each function.
 *   * This makes it easier to use these functions outside of the vxrn CLI by
 *     supplying only the required values.
 *   * Over time, we can progressively eliminate dependencies on
 *     `VXRNOptionsFilled` across the codebase.
 */
export type VXRNOptionsFilled = Awaited<ReturnType<typeof fillOptions>>

let optionsFilled: VXRNOptionsFilled | null = null

export async function fillOptions(
  options: VXRNOptions,
  { mode = 'dev' }: { mode?: Mode } = {}
) {
  const { root = process.cwd(), entries } = options

  const devMode = options.mode === 'production' ? false : mode === 'dev'

  if (!devMode) {
    console.info(`❶ Running dev server in production mode`)
  }

  const packageRootDir = join(require.resolve('vxrn'), '../..')
  const cacheDir = getCacheDir(root)

  const [state, packageJSON] = await Promise.all([readState(cacheDir), readPackageJSON()])

  const deps = packageJSON.dependencies || {}

  const packageVersions =
    deps.react && deps['react-native']
      ? {
          react: deps.react.replace(/[\^~]/, ''),
          reactNative: deps['react-native'].replace(/[\^~]/, ''),
        }
      : undefined

  const versionHash = hashString(JSON.stringify(packageJSON))
  const clean =
    (options.clean ?? (state.versionHash && state.versionHash !== versionHash))
      ? 'vite'
      : false

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
