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

function createCommands(options = {}) {
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
              'VxRN apps set entries.native through vxrn/react-native-commands.',
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

    func: async (argv, ctx, args, bundleImpl) => {
      const buildBundleModule = await import('./dist/rn-commands/bundle/buildBundle.mjs')
      const { buildBundle } = buildBundleModule
      return await buildBundle(
        argv,
        { ...ctx, vxrnEntries: options.entries },
        args,
        bundleImpl
      )
    },
  }

  return [bundleCommand]
}

const commands = createCommands()
commands.createCommands = createCommands

module.exports = commands
