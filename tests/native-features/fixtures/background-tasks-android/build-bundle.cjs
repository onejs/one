const path = require('node:path')
const fs = require('node:fs')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')
const Metro = require('metro')
const root = path.resolve(__dirname, '../../../..')
const config = mergeConfig(getDefaultConfig(root), {
  maxWorkers: 2,
  watchFolders: [fs.realpathSync(path.join(root, 'node_modules'))],
  resolver: { nodeModulesPaths: [path.join(root, 'node_modules')] },
  transformer: {
    babelTransformerPath: require.resolve('@react-native/metro-babel-transformer'),
  },
})
Metro.runBuild(config, {
  entry: path.join(__dirname, 'entry.tsx'),
  out: path.join(__dirname, 'assets/index.android.bundle'),
  platform: 'android',
  dev: false,
  minify: true,
})
  .then(() => console.log('BACKGROUND_BUNDLE_READY'))
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
