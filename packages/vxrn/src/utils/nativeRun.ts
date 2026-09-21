import { execFileSync } from 'node:child_process'
import module from 'node:module'
import path from 'node:path'

// expo-free run: one owns the dev server, the port, and device forwarding
// arguments. react native community cli owns build, install, and launch.
// `--no-packager` is what keeps community cli from starting its own bundler
// (without one's transforms). nothing here resolves the expo cli.

export function buildNativeRunCommand(args: {
  platform: 'ios' | 'android'
  port?: number
}): { command: string; argv: string[]; port: number } {
  const port = args.port || 8081
  return {
    command: args.platform === 'ios' ? 'run-ios' : 'run-android',
    argv: ['--no-packager', '--port', String(port)],
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
  spawn = defaultSpawn,
}: {
  root: string
  platform: 'ios' | 'android'
  port?: number
  spawn?: NativeRunSpawn
}) {
  const { fillOptions } = await import('../config/getOptionsFilled')
  const { applyBuiltInPatches } = await import('../utils/patches')
  const options = await fillOptions({ root })

  await applyBuiltInPatches(options)

  const { command, argv, port: resolvedPort } = buildNativeRunCommand({ platform, port })
  if (!(await devServerRunning(resolvedPort))) {
    throw new Error(
      `\nNo dev server running on http://localhost:${resolvedPort} — the app loads its JS from it.\n` +
        `Start it first (e.g. \`bun dev\` or \`one dev\`), then re-run this command.`
    )
  }

  // bake the port into the native build: React-Core's xcconfig resolves
  // RCT_METRO_PORT from the environment into a preprocessor define
  // that RCTBundleURLProvider uses as its default packager port.
  process.env.RCT_METRO_PORT = String(resolvedPort)

  // resolve the community cli from the user's project, since vxrn may be
  // installed globally or at the root workspace.
  const require = module.createRequire(root + '/')
  const cliPackageJson = require.resolve('@react-native-community/cli/package.json', {
    paths: [root],
  })
  const bin = path.join(path.dirname(cliPackageJson), 'build', 'bin.js')

  spawn(process.execPath, [bin, command, ...argv], {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
}
