import { execFileSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { readdirSync } from 'node:fs'
import { basename, dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const [rootArg, simulator, port, derivedArg, mode] = process.argv.slice(2)
if (!rootArg || !simulator || !port || !derivedArg || (mode && mode !== '--build-only'))
  throw new Error(
    'Usage: realapps-ios-build.ts <app> <simulator> <port> <derived data> [--build-only]'
  )
const root = resolve(rootArg)
const ios = join(root, 'ios')
const workspaceName = readdirSync(ios).find((name) => name.endsWith('.xcworkspace'))
if (!workspaceName) throw new Error('Generated Xcode workspace missing')
const workspace = join(ios, workspaceName)
const scheme = basename(workspaceName, '.xcworkspace')
const derived = resolve(derivedArg)
const require = createRequire(join(root, 'package.json'))
const { resolveIosBundleId } = await import(
  pathToFileURL(
    join(dirname(require.resolve('vxrn/package.json')), 'dist/utils/nativeRun.mjs')
  ).href
)
const bundleId = resolveIosBundleId(root)
if (!bundleId) throw new Error('Generated bundle identity missing')
function mcp(command: string, args: string[]) {
  const output = execFileSync(
    'xcodebuildmcp',
    ['simulator', command, ...args, '--output', 'json'],
    {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, RCT_METRO_PORT: port },
    }
  )
  console.log(output)
  const result = JSON.parse(output)
  if (result.didError !== false || result.data?.summary?.status !== 'SUCCEEDED')
    throw new Error(`XcodeBuildMCP ${command} failed`)
}
mcp('build', [
  '--workspace-path',
  workspace,
  '--scheme',
  scheme,
  '--simulator-id',
  simulator,
  '--derived-data-path',
  derived,
])
if (mode === '--build-only') process.exit(0)
// a claimed simulator may be shut down; boot it if needed and wait until it accepts installs
execFileSync('xcrun', ['simctl', 'bootstatus', simulator, '-b'], { stdio: 'inherit' })
mcp('install', [
  '--simulator-id',
  simulator,
  '--app-path',
  join(derived, 'Build/Products/Debug-iphonesimulator', `${scheme}.app`),
])
// RCTBundleURLProvider reads this same default in One's native run command.
execFileSync('xcrun', [
  'simctl',
  'spawn',
  simulator,
  'defaults',
  'write',
  bundleId,
  'RCT_jsLocation',
  `localhost:${port}`,
])
mcp('launch-app', ['--simulator-id', simulator, '--bundle-id', bundleId])
console.log(`RAN ${bundleId} built, installed and launched on ${simulator}`)
