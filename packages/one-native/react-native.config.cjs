module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import dev.onejs.onenative.OneNativePackage;',
        packageInstance: 'new OneNativePackage()',
      },
    },
  },
}
