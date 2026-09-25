const path = require('node:path')
// one's own native code autolinks as the `one` dependency. these are its native
// dependencies, which the app does not declare, so they resolve from one.
const bundledNativePackages = [
  '@op-engineering/op-sqlite',
  'react-native-nitro-image',
  'react-native-nitro-modules',
  'react-native-nitro-web-image',
]

module.exports = {
  commands: [...require('vxrn/react-native-commands')],
  dependencies: Object.fromEntries(
    bundledNativePackages.map((name) => [
      name,
      { root: path.dirname(require.resolve(`${name}/package.json`, { paths: [__dirname] })) },
    ])
  ),
}
