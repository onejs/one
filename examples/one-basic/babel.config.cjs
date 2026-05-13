const oneBabelPreset = require('one/babel-preset')
const preset = oneBabelPreset.default || oneBabelPreset

module.exports = function (api) {
  return preset(api, {})
}
