import { execFileSync } from 'node:child_process'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import module from 'node:module'
import path from 'node:path'

// expo-free run: one owns the dev server, the port, and device forwarding
// arguments. react native community cli owns build, install, and launch.
// `--no-packager` is what keeps community cli from starting its own bundler
// (without one's transforms). nothing here resolves the expo cli.

export function buildNativeRunCommand(args: {
  platform: 'ios' | 'android'
  port?: number
  simulator?: string
  udid?: string
}): { command: string; argv: string[]; port: number } {
  const port = args.port || 8081
  const argv = ['--no-packager', '--port', String(port)]
  // without an explicit target the community cli picks a booted simulator
  // (or the first in the list) on its own, which is the wrong device
  // whenever more than one simulator exists.
  if (args.simulator) argv.push('--simulator', args.simulator)
  if (args.udid) argv.push('--udid', args.udid)
  if (args.platform === 'android' && process.env.ANDROID_SERIAL)
    argv.push('--device', process.env.ANDROID_SERIAL)
  return {
    command: args.platform === 'ios' ? 'run-ios' : 'run-android',
    argv,
    port,
  }
}

// the built app loads its js from the one/vxrn dev server, never from a
// community-started packager. requiring the server up-front keeps that the
// only path — the community cli would otherwise boot its own bundler
// (without one's transforms) when the port is free.
async function devServerRunning(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://localhost:${port}/status`, {
      signal: AbortSignal.timeout(3000),
    })
    return (await res.text()).includes('packager-status:running')
  } catch {
    return false
  }
}

export type NativeRunSpawn = (
  executable: string,
  argv: string[],
  options: { cwd: string; stdio: 'inherit'; env: NodeJS.ProcessEnv }
) => void

const defaultSpawn: NativeRunSpawn = (executable, argv, options) => {
  execFileSync(executable, argv, options)
}

export async function nativeRun({
  root,
  platform,
  port,
  simulator,
  udid,
  spawn = defaultSpawn,
}: {
  root: string
  platform: 'ios' | 'android'
  port?: number
  simulator?: string
  udid?: string
  spawn?: NativeRunSpawn
}) {
  const { fillOptions } = await import('../config/getOptionsFilled')
  const { applyBuiltInPatches } = await import('../utils/patches')
  const options = await fillOptions({ root })

  await applyBuiltInPatches(options)

  const { command, argv, port: resolvedPort } = buildNativeRunCommand({
    platform,
    port,
    simulator,
    udid,
  })
  if (!(await devServerRunning(resolvedPort))) {
    throw new Error(
      `\nNo dev server running on http://localhost:${resolvedPort} — the app loads its JS from it.\n` +
        `Start it first (e.g. \`bun dev\` or \`one dev\`), then re-run this command.`
    )
  }

  // source-built React-Core bakes RCT_METRO_PORT from this environment
  // into a preprocessor define that RCTBundleURLProvider uses as its
  // default packager port. with prebuilt pods the port is already baked
  // (8081), so the simulator default below is what points the app.
  process.env.RCT_METRO_PORT = String(resolvedPort)

  // vxrn owns the cli; cwd still selects the app's config and native project.
  const require = module.createRequire(import.meta.url)
  const cliPackageJson = require.resolve('@react-native-community/cli/package.json')
  const bin = path.join(path.dirname(cliPackageJson), 'build', 'bin.js')

  spawn(process.execPath, [bin, command, ...argv], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })

  if (platform === 'ios' && resolvedPort !== 8081) {
    pointSimulatorAtDevServer({ root, udid, port: resolvedPort })
  }
}

// the simulator build embeds no ip.txt, so RCTBundleURLProvider probes
// localhost at its baked-in port (8081 with prebuilt pods) and gives up
// with "no script url" when the dev server lives on one's port. writing
// the provider's jsLocation default aims it at the real server.
// the bundle id the built app carries, read from the ios project either
// prebuild generated, so an app configured by native.app or app.json both
// resolve.
export function resolveIosBundleId(root: string): string | null {
  const iosDir = path.join(root, 'ios')
  if (!existsSync(iosDir)) return null
  const project = readdirSync(iosDir).find((entry) => entry.endsWith('.xcodeproj'))
  if (!project) return null
  const pbxproj = path.join(iosDir, project, 'project.pbxproj')
  if (!existsSync(pbxproj)) return null
  const match = readFileSync(pbxproj, 'utf8').match(/PRODUCT_BUNDLE_IDENTIFIER = "?([A-Za-z0-9.-]+)"?;/)
  return match ? match[1] : null
}

function bootedSimulatorUdid(): string | null {
  try {
    const out = execFileSync('xcrun', ['simctl', 'list', 'devices', 'booted', '-j'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    const devices = (JSON.parse(out) as { devices?: Record<string, Array<{ udid?: string; state?: string; isAvailable?: boolean }>> }).devices ?? {}
    for (const list of Object.values(devices)) {
      for (const device of list ?? []) {
        if (device?.udid && device.isAvailable !== false) return device.udid
      }
    }
    return null
  } catch {
    return null
  }
}

function pointSimulatorAtDevServer(args: { root: string; udid?: string; port: number }) {
  const udid = args.udid ?? bootedSimulatorUdid()
  const bundleId = resolveIosBundleId(args.root)
  if (!udid || !bundleId) {
    console.warn(
      `\n[one] could not point the simulator at the dev server (udid: ${udid ?? 'none'}, bundle id: ${bundleId ?? 'none'}).\n` +
        `if the app shows "no script url", reload it with the bundler host set to localhost:${args.port} in the dev menu.`
    )
    return
  }
  try {
    execFileSync(
      'xcrun',
      ['simctl', 'spawn', udid, 'defaults', 'write', bundleId, 'RCT_jsLocation', `localhost:${args.port}`],
      { stdio: 'pipe' }
    )
    // the community cli already launched the app before the default
    // existed; relaunch so the first paint loads js from the server.
    try {
      execFileSync('xcrun', ['simctl', 'terminate', udid, bundleId], { stdio: 'pipe' })
    } catch {
      // not running; launch below still applies
    }
    execFileSync('xcrun', ['simctl', 'launch', udid, bundleId], { stdio: 'pipe' })
    console.info(`[one] pointed ${bundleId} at localhost:${args.port}`)
  } catch {
    console.warn(
      `\n[one] could not write the packager location for ${bundleId}.\n` +
        `if the app shows "no script url", reload it with the bundler host set to localhost:${args.port} in the dev menu.`
    )
  }
}
