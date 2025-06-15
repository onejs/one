import module from 'node:module'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'
import picocolors from 'picocolors'

export async function expoRun({
  root,
  platform,
  port,
}: { root: string; platform: 'ios' | 'android'; port?: number }) {
  if (platform !== 'ios') {
    console.warn(
      picocolors.yellow(
        `🚧  The ${platform} platform is less tested and you might encounter unexpected errors. Let us know if anything breaks.`
      )
    )
  }

  const options = await fillOptions({ root })

  applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })

  try {
    // Import Expo from the user's project instead of from where vxrn is installed, since vxrn may be installed globally or at the root workspace.
    const require = module.createRequire(root)
    const importPath = require.resolve(`@expo/cli/build/src/run/${platform}/index.js`, {
      paths: [root],
    })
    const expoRun = (await import(importPath)).default[
      `expoRun${platform.charAt(0).toUpperCase() + platform.slice(1)}`
    ]
    await expoRun([
      // Do not start the Metro bundler automatically
      `--no-bundler`,
      // CommandError: --port and --no-bundler are mutually exclusive arguments
      // `--port`,
      // `${port || 8081}`,
    ])
  } catch (e) {
    console.error(`Failed to run native project: ${e}\nIs "expo" listed in your dependencies?`)
  }
}
