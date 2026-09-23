const path = require('node:path')
const nativeRoot = path.dirname(require.resolve('@vxrn/native/package.json'))
const bundledNativePackages = [
  '@op-engineering/op-sqlite',
  'react-native-nitro-image',
  'react-native-nitro-modules',
  'react-native-nitro-web-image',
]

module.exports = {
  commands: [...require('vxrn/react-native-commands')],
  dependencies: {
    '@vxrn/native': {
      root: nativeRoot,
    },
    ...Object.fromEntries(
      bundledNativePackages.map((name) => [
        name,
        { root: path.dirname(require.resolve(`${name}/package.json`, { paths: [nativeRoot] })) },
      ])
    ),
  },
}
