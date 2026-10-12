// an Expo-prebuilt consumer of the same source-import fixture and routes.
module.exports = {
  expo: {
    name: 'NativeSourceExpoTests',
    slug: 'native-source-expo-tests',
    scheme: 'nativefeatures',
    android: { package: 'dev.vxrn.nativesource.expo.tests' },
    plugins: [['vxrn/expo-plugin', { nativeSource: true }]],
  },
}
