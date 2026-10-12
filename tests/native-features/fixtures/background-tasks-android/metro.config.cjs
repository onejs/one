const path = require('node:path')
const fs = require('node:fs')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const root = path.resolve(__dirname, '../../../..')
module.exports = mergeConfig(getDefaultConfig(root), {
  maxWorkers: 2,
  // the programmatic runBuild API does not prepend projectRoot to its crawl roots.
  watchFolders: [root, fs.realpathSync(path.join(root, 'node_modules'))],
  resolver: { nodeModulesPaths: [path.join(root, 'node_modules')] },
  transformer: {
    babelTransformerPath: require.resolve('@react-native/metro-babel-transformer'),
  },
})
