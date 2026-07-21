module.exports = {
  dependency: {
    platforms: {
      ios: {
        podspecPath: './VxrnNative.podspec',
      },
      android: {
        sourceDir: './android',
        packageImportPath: 'import dev.vxrn.native.VxrnNativePackage;',
        packageInstance: 'new VxrnNativePackage()',
      },
    },
  },
}
