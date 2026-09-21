const path = require('node:path')

module.exports = {
  commands: [...require('vxrn/react-native-commands')],
  dependencies: {
    '@vxrn/native': {
      root: path.dirname(require.resolve('@vxrn/native/package.json')),
    },
  },
}
