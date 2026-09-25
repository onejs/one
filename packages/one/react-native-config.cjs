const { existsSync } = require('node:fs')
const path = require('node:path')
const { absorbedPackageNames } = require('./dist/cjs/utils/absorbedPackages.cjs')
// one's own native code autolinks as the `one` dependency. these are its native
// dependencies, which the app does not declare, so they resolve from one.
const bundledNativePackages = [
  '@op-engineering/op-sqlite',
  'react-native-nitro-image',
  'react-native-nitro-modules',
  'react-native-nitro-web-image',
]

// autolinking runs from the app root or its ios/android folder, and resolves
// the app the same way: the nearest package.json above the working directory.
function appRoot() {
  let dir = process.cwd()
  while (!existsSync(path.join(dir, 'package.json'))) {
    const parent = path.dirname(dir)
    if (parent === dir) throw new Error('[one] react-native-config found no package.json')
    dir = parent
  }
  return dir
}

module.exports = {
  commands: [...require('vxrn/react-native-commands')],
  dependencies: Object.fromEntries([
    ...bundledNativePackages.map((name) => [
      name,
      { root: path.dirname(require.resolve(`${name}/package.json`, { paths: [__dirname] })) },
    ]),
    // one implements the packages it absorbs natively, so their own native
    // code never links.
    ...absorbedPackageNames(appRoot()).map((name) => [
      name,
      { platforms: { ios: null, android: null } },
    ]),
  ]),
}
