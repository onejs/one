import { getPort } from 'get-port-please'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { readPackageJSON } from 'pkg-types'
import type { VXRNOptions } from '../types'
import { readState, writeState } from './state'

const require = createRequire(import.meta.url)

export type VXRNOptionsFilled = Awaited<ReturnType<typeof fillOptions>>

let optionsFilled: VXRNOptionsFilled | null = null

export async function fillOptions(
  options: VXRNOptions,
  internal: { mode?: 'dev' | 'prod' } = { mode: 'dev' }
) {
  const { root = process.cwd(), server = {}, entries } = options
  const {
    host = '0.0.0.0' /* TODO: Better default to 127.0.0.1 due to security reasons, and only dynamically change to 0.0.0.0 if the user is requesting an Expo QR code */,
    https,
  } = server

  const devMode = options.mode === 'production' ? false : internal.mode === 'dev'

  if (!devMode) {
    console.info(`❶ Running dev server in production mode`)
  }

  const defaultPort = server.port || (internal.mode === 'dev' ? 8081 : 3000)
  const packageRootDir = join(require.resolve('vxrn'), '../..')
  const cacheDir = join(root, 'node_modules', '.vxrn')

  const [port, state, packageJSON] = await Promise.all([
    getPort({
      port: defaultPort,
      portRange: [defaultPort, defaultPort + 100],
      host,
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

  if (typeof options.build?.server !== 'boolean' && !options.build?.server) {
    // default building server to off
    options.build ||= {}
    options.build.server = false
  }

  const protocol = https ? ('https:' as const) : ('http:' as const)
  const bundleId = Math.round(Math.random() * 100_000)

  const final = {
    ...options,
    debugBundlePaths: {
      ios: join(tmpdir(), `bundle-${bundleId}-ios.js`),
      android: join(tmpdir(), `bundle-${bundleId}-android.js`),
    },
    mode: devMode ? ('development' as const) : ('production' as const),
    clean,
    root,
    server: {
      ...options.server,
      port,
      host,
      protocol,
      url: `${protocol}//${host}:${port}`,
    },
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
  }

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
