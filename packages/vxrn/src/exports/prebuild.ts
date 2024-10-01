import module from 'node:module'
import { getOptionsFilled } from '../utils/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'

export const prebuild = async ({ root }: { root: string }) => {
  const options = await getOptionsFilled({ root })

  applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })
  try {
    // Import Expo from the user's project instead of from where vxrn is installed, since vxrn may be installed globally or at the root workspace.
    const require = module.createRequire(root)
    const importPath = require.resolve('@expo/cli/build/src/prebuild/index.js', {
      paths: [root],
    })
    const expoPrebuild = (await import(importPath)).default.expoPrebuild
    await expoPrebuild([
      '--platform',
      'ios', // we only support iOS for now
      '--skip-dependency-update',
      'react,react-native,expo',
    ])

    console.info(
      'Run `open ios/*.xcworkspace` in your terminal to open the prebuilt iOS project, then you can either run it via Xcode or archive it for distribution.'
    )
  } catch (e) {
    console.error(`Failed to prebuild native project: ${e}\nIs "expo" listed in your dependencies?`)
  }
}
