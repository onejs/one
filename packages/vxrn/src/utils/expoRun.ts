import module from 'node:module'
import { pathToFileURL } from 'node:url'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'

// the built app loads its js from the one/vxrn dev server, never from an
// expo-started metro. we pass `--port` (not `--no-bundler`) because expo
// hardcodes the launch url to 8081 under --no-bundler, while with a port it
// detects the already-running dev server for this project root and skips
// starting its own bundler ("dev server is already running in another
// window"). requiring the server up-front keeps that the only path — expo
// would otherwise boot its own metro (without one's transforms) when the
// port is free.
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

export async function expoRun({
  root,
  platform,
  port,
}: {
  root: string
  platform: 'ios' | 'android'
  port?: number
}) {
  const options = await fillOptions({ root })

  applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

  const resolvedPort = port || 8081
  if (!(await devServerRunning(resolvedPort))) {
    console.error(
      `\nNo dev server running on http://localhost:${resolvedPort} — the app loads its JS from it.\n` +
        `Start it first (e.g. \`bun dev\` or \`one dev\`), then re-run this command.`
    )
    process.exit(1)
  }

  // bake the port into the native build: React-Core's xcconfig resolves
  // RCT_METRO_PORT from the xcodebuild environment into a preprocessor define
  // that RCTBundleURLProvider uses as its default packager port. expo only
  // sets this env when it starts its own bundler, and our reuse path skips
  // that — without it the app probes 8081 and shows "No script URL provided".
  process.env.RCT_METRO_PORT = String(resolvedPort)

  try {
    // Import Expo from the user's project instead of from where vxrn is installed, since vxrn may be installed globally or at the root workspace.
    const require = module.createRequire(root)
    const importPath = require.resolve(`@expo/cli/build/src/run/${platform}/index.js`, {
      paths: [root],
    })
    const expoRun = (await import(pathToFileURL(importPath).href)).default[
      `expoRun${platform.charAt(0).toUpperCase() + platform.slice(1)}`
    ]
    await expoRun([`--port`, `${resolvedPort}`])
  } catch (e) {
    console.error(
      `Failed to run native project: ${e}\nIs "expo" listed in your dependencies?`
    )
  }
}
