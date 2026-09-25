import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { resolvePath } from '@vxrn/resolve'
import { swiftPackageDirOf, swiftPackageId } from 'vxrn'
import type { Plugin } from 'vite'

// on device a .swift import is the swift package compiled into the app by
// prebuild (see vxrn generateSwiftPackages): the module is a host view naming
// the package, with the importer's props passed through as json. an imported
// file whose @main type is an App is a whole swift app, so its root fills the
// screen instead of sizing to its content.
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
        const fill = /@main\s+struct\s+\w+\s*:\s*(SwiftUI\.)?App\b/.test(readFileSync(id, 'utf8'))
        // the generated module is bundled as if it lived at the .swift file, so
        // one's own swift host resolves from the importer to an absolute path.
        const swiftHost = join(
          dirname(resolvePath('one/package.json', dirname(id))),
          'dist/esm/platform/swift/index.native.js'
        )
        return `import { createElement } from 'react'
import { SwiftPackageView } from ${JSON.stringify(swiftHost)}
export default function SwiftPackage(props) {
  return createElement(SwiftPackageView, { packageName: ${JSON.stringify(swiftPackageId(packageDir))}, props, fill: ${fill} })
}
`
      },
    },
  }
}
