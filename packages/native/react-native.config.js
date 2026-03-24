module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: './ios/VxrnNative.podspec',
      },
      android: {
        sourceDir: './android',
        packageImportPath: 'import dev.vxrn.native.VxrnNativePackage;',
        packageInstance: 'new VxrnNativePackage()',
      },
    },
  },
}
