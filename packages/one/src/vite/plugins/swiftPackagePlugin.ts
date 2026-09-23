import { swiftPackageDirOf, swiftPackageId } from 'vxrn'
import type { Plugin } from 'vite'

// on device a .swift import is the swift package compiled into the app by
// prebuild (see vxrn generateSwiftPackages): the module is a host view naming
// the package, with the importer's props passed through as json.
export function swiftPackagePlugin(): Plugin {
  return {
    name: 'one:swift-package',
    load: {
      filter: { id: /\.swift$/ },
      handler(id) {
        const packageDir = swiftPackageDirOf(id)
        if (!packageDir) {
          throw new Error(`[one] ${id} is not inside a swift package (no Package.swift above it)`)
        }
        return `import { createElement } from 'react'
import { SwiftPackageView } from '@vxrn/native/swift'
export default function SwiftPackage(props) {
  return createElement(SwiftPackageView, { packageName: ${JSON.stringify(swiftPackageId(packageDir))}, props })
}
`
      },
    },
  }
}
