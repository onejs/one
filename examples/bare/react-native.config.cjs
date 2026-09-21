const { createCommands } = require('vxrn/react-native-commands')

module.exports = {
  commands: createCommands({
    entries: {
      native: './src/entry-native.tsx',
    },
  }),
}
