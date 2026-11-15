// an Expo-prebuilt app: vxrn/expo-plugin writes the one/ios sdk bindings pod
// and facades the way one prebuild does.
module.exports = {
  expo: {
    name: 'ExpoSdkTest',
    slug: 'expo-sdk-test',
    scheme: 'expososdk',
    ios: { bundleIdentifier: 'dev.vxrn.expo.sdk.test' },
    plugins: [['vxrn/expo-plugin', {}]],
  },
}
