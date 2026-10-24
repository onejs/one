// Bundles the island app with Metro, react-native's own bundler, in release
// mode for the ios platform: One has no windows platform resolution yet, so
// react-native's ios files apply and Platform.OS reads 'ios'. The bundle
// resolves from the repository's installed node_modules.
//   node bundle.mjs <out.js>
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const nodeModules = process.env.ONE_ISLAND_NODE_MODULES ?? join(resolve(here, '../../../../..'), 'node_modules')
const require = createRequire(join(nodeModules, 'package.json'))
const Metro = require('metro')
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config')

const config = await Metro.loadConfig({ cwd: here }, mergeConfig(getDefaultConfig(here), {
  projectRoot: here,
  watchFolders: [nodeModules],
  resolver: { nodeModulesPaths: [nodeModules], useWatchman: false },
}))
await Metro.runBuild(config, {
  entry: 'index.js',
  platform: 'ios',
  dev: false,
  minify: false,
  out: resolve(process.argv[2]),
})
