import type { Plugin } from 'vite'
import { renderSwiftPackageModule } from './swiftPackageModule'

// on device a .swift import is the swift package compiled into the app by
// prebuild (see vxrn generateSwiftPackages): the module is a host view naming
// the package, with the importer's props passed through as json. an imported
// file whose @main type is an App is a whole swift app, so its root fills the
// screen instead of sizing to its content. the contract parser loads on the
// first .swift import, so an app without one never evaluates it.
export function swiftPackagePlugin(platform: 'ios' | 'android', root: string): Plugin {
  return {
    name: 'one:swift-package',
    load: {
      filter: { id: /\.swift$/ },
      handler(id) {
        const { code, watchFiles } = renderSwiftPackageModule(id, platform, root)
        for (const file of watchFiles) this.addWatchFile(file)
        return code
      },
    },
  }
}
