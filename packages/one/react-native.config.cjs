module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        packageImportPath: 'import dev.onejs.one.OnePackage;',
        packageInstance: 'new OnePackage()',
      },
    },
  },
}
