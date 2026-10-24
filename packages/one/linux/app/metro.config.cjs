// bundles the proof app against an installed node_modules (ONE_NODE_MODULES)
const modules = process.env.ONE_NODE_MODULES
const { getDefaultConfig, mergeConfig } = require(modules + '/@react-native/metro-config/dist/index.js')

module.exports = mergeConfig(getDefaultConfig(__dirname), {
  projectRoot: __dirname,
  watchFolders: [__dirname, modules],
  resolver: { nodeModulesPaths: [modules] },
})
