import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { swiftPackageDirOf, swiftPackageId } from 'vxrn/swift-package-id'
import { methodSubscribed, methodWired, renderMethodCall, renderViewWires, toNativeSourceStructs } from './nativeSourceWires'

// both native bundlers turn a swift source import into the same js host module.
export function renderSwiftPackageModule(id: string, platform: string, root: string) {
  if (platform !== 'ios') {
    throw new Error(
      `[one] ${id} is Swift source and cannot be imported into an Android build; use an .android.ts entry`
    )
  }
  const appManifest = join(root, 'package.json')
  const app = existsSync(appManifest) ? JSON.parse(readFileSync(appManifest, 'utf8')) : {}
  const packageDir = swiftPackageDirOf(id)
  if (!packageDir) {
    throw new Error(
      `[one] ${id} is not inside a swift package (no Package.swift above it)`
    )
  }
  const packageName = swiftPackageId(packageDir)
  if (
    Object.hasOwn(app.dependencies ?? {}, 'expo') ||
    Object.hasOwn(app.devDependencies ?? {}, 'expo')
  ) {
    // expo prebuild generates the same local pod when the app enables
    // nativeSource in withVxrn; fail fast while it is missing.
    const podspec = join(root, 'ios', 'OneSwiftPackages', packageName, `${packageName}.podspec`)
    if (!existsSync(podspec)) {
      throw new Error(
        `[one] ${id} needs one prebuild, or Expo prebuild with nativeSource enabled in the vxrn config plugin and ios generated`
      )
    }
  }
  const requireFromFile = createRequire(id)
  const { writeNativeSourceDeclaration, writeSwiftPackageArtifacts } = requireFromFile(
    'vxrn/native-source-contract'
  ) as typeof import('vxrn/native-source-contract')
  const contract = writeNativeSourceDeclaration(id)
  const artifacts = writeSwiftPackageArtifacts(packageDir)
  // sibling contract edits change this hash and require a native rebuild; stale js fails closed.
  const hash = artifacts.hash
  const watchFiles = Object.keys(artifacts.files).map((file) => join(packageDir, file))
  const fill = /@main\s+struct\s+\w+\s*:\s*(SwiftUI\.)?App\b/.test(
    readFileSync(id, 'utf8')
  )
  // the generated module keeps the swift file as its resolver origin.
  const oneRoot = dirname(requireFromFile.resolve('one/package.json'))
  const swiftHost = join(oneRoot, 'dist/esm/platform/swift/index.native.js')
  const nativeSource = join(oneRoot, 'dist/esm/platform/native-source/index.native.js')
  const wireModule = join(oneRoot, 'dist/esm/platform/native-source/wire.native.js')
  const eventsModule = join(oneRoot, 'dist/esm/platform/native-source/events.native.js')
  const needsWire = contract.modules.some((module) => module.methods.some(methodWired))
  const needsEvents = contract.modules.some((module) => module.methods.some(methodSubscribed))
  const structs = needsWire || needsEvents ? `\nconst nativeSourceStructs = ${JSON.stringify(toNativeSourceStructs(contract.structs))}` : ''
  const exports = contract.modules
    .map(
      (module) =>
        `export const ${module.name} = Object.freeze({${module.methods
          .map((method) => renderMethodCall(`${packageName}.${module.name}`, method, hash))
          .join(',')}})`
    )
    .join('\n')
  const views = contract.views
    .map(
      (view) =>
        `export function ${view.name}(props) { return createElement(SwiftPackageView, { packageName: ${JSON.stringify(packageName)}, view: ${JSON.stringify(view.name)}, contractHash: ${JSON.stringify(hash)}, props, fill: false${renderViewWires(view, contract.structs)} }) }`
    )
    .join('\n')
  const code = `${contract.modules.length > 0 ? `import { callNativeSource } from ${JSON.stringify(nativeSource)}\n` : ''}${needsWire ? `import { encodeNativeSourceArgs, decodeNativeSourceResult } from ${JSON.stringify(wireModule)}\n` : ''}${needsEvents ? `import { subscribeNativeSourceEvent } from ${JSON.stringify(eventsModule)}\n` : ''}${
    contract.defaultView || views
      ? `import { createElement } from 'react'
import { SwiftPackageView } from ${JSON.stringify(swiftHost)}
`
      : ''
  }${structs}${
    contract.defaultView
      ? `export default function SwiftPackage(props) {
  return createElement(SwiftPackageView, { packageName: ${JSON.stringify(packageName)}, view: '', contractHash: '', props, fill: ${fill} })
}
`
      : ''
  }${exports}
${views}
`
  return { code, watchFiles }
}
