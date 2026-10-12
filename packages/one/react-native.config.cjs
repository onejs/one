module.exports = {
  dependency: {
    platforms: {
      android: {
        sourceDir: './android',
        cmakeListsPath: './portal/CMakeLists.txt',
        componentDescriptors: [
          ...require('./schema.json')
            .components.filter((component) => !component.interfaceOnly)
            .map((component) => `${component.name}ComponentDescriptor`),
          'OnePortalComponentDescriptor',
        ],
        packageImportPath: 'import dev.onejs.one.OnePackage;',
        packageInstance: 'new OnePackage()',
      },
    },
  },
}
