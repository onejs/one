module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import dev.vxrn.nativebridge.VxrnNativePackage;',
        packageInstance: 'new VxrnNativePackage()',
      },
    },
  },
}
