// repro: byte-equivalent shim that ci/eas auto-generates for one + expo-updates
const { withOne } = require('one/metro-config')

module.exports = withOne(__dirname)
