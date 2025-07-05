const { dirname } = require('node:path')
const resolvePath = require('@vxrn/resolve').resolvePath

const reactNativePath = (() => {
  try {
    return dirname(resolvePath('react-native/package.json'))
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[vxrn/react-native-commands] Failed to resolve react-native/package.json. Is react-native installed in your project? ${e.message}`
    }

    throw e
  }
})()
const rnCommunityCliPluginPath = (() => {
  // First try to resolve from the current directory (normally the user's project dir).
  let firstError
  try {
    return resolvePath('@react-native/community-cli-plugin')
  } catch (e) {
    firstError = e
  }
  // If that fails, try to resolve from the react-native package.
  try {
    return resolvePath('@react-native/community-cli-plugin', reactNativePath)
  } catch (e) {
    if (e instanceof Error) {
      e.message = `[vxrn/react-native-commands] Failed to resolve @react-native/community-cli-plugin. It should be a react-native dependency and normally will be installed if you are using react-native. But you can still try to install it manually to resolve this issue.\n1. ${firstError instanceof Error ? firstError.message : 'unknown error'}\n2. ${e.message}`
    }

    throw e
  }
})()

const rnCommunityCliPlugin = require(rnCommunityCliPluginPath)

const bundleCommand = {
  ...rnCommunityCliPlugin.bundleCommand,
  name: 'bundle',
  options: [
    ...rnCommunityCliPlugin.bundleCommand.options.map((o) => {
      if (o.name.startsWith('--entry-file')) {
        return {
          ...o,
          description: [
            o.description,
            'but note that with VxRN, this is not going to be used since the entry file should be specified via plugin options.',
          ].join(', '),
        }
      }

      return o
    }),
    {
      name: '--config-cmd',
      description:
        'This is not actually in use, but it is needed for the compatibility with React Native v0.76 since it is passed during the build process of native apps (see: https://github.com/facebook/react-native/blob/v0.76.0/packages/react-native/scripts/react-native-xcode.sh#L142-L149).',
    },
  ],

  func: async (...args) => {
    const buildBundleModule = await import('./dist/rn-commands/bundle/buildBundle.mjs')
    // const buildBundleModule = await import('./dist/rn-commands/bundle/buildBundle.metro.mjs')
    // const buildBundle = buildBundleModule.buildBundle.bind({
    //   rnCommunityCliPluginPath,
    // })
    const { buildBundle } = buildBundleModule
    return await buildBundle(...args)
  },
}

const commands = [bundleCommand]

module.exports = commands
