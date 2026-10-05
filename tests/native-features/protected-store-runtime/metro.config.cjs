const path = require('node:path')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const root = path.resolve(__dirname, '../../..')
module.exports = mergeConfig(getDefaultConfig(path.resolve(__dirname, '..')), {
  watchFolders: [root],
  resolver: { nodeModulesPaths: [path.join(root, 'node_modules')] },
})
