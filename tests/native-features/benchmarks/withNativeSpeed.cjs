const {
  withPodfileProperties,
  withAndroidManifest,
  withPodfile,
} = require('expo/config-plugins')
module.exports = (config) => {
  config = withPodfileProperties(config, (mod) => {
    mod.modResults['ios.deploymentTarget'] = '17.0'
    return mod
  })
  config = withPodfile(config, (mod) => {
    mod.modResults.contents = mod.modResults.contents.replace(
      '  use_expo_modules!',
      "  use_expo_modules!\n  pod 'SDWebImage', :modular_headers => true"
    )
    return mod
  })
  return withAndroidManifest(config, (mod) => {
    mod.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true'
    return mod
  })
}
