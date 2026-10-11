import { existsSync, readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { methodSubscribed, methodWired, renderMethodCall, renderViewWires } from './nativeSourceWires'

// both native bundlers turn a kotlin source import into the same js module:
// each OneModule object calls into the prebuilt glue, each public @Composable
// function becomes a component of the kotlin host view.
export function renderKotlinSourceModule(id: string, platform: string, root: string) {
  if (platform !== 'android') {
    throw new Error(
      `[one] ${id} is Kotlin source and cannot be imported into an iOS build; use an .ios.ts entry`
    )
  }
  const appManifest = join(root, 'package.json')
  const app = existsSync(appManifest) ? JSON.parse(readFileSync(appManifest, 'utf8')) : {}
  const requireFromFile = createRequire(id)
  const { kotlinSourceId, renderKotlinSourceGlue, writeNativeSourceDeclaration } =
    requireFromFile('vxrn/native-source-contract') as typeof import('vxrn/native-source-contract')
  const contract = writeNativeSourceDeclaration(id)
  const sourceId = kotlinSourceId(root, id)
  if (
    Object.hasOwn(app.dependencies ?? {}, 'expo') ||
    Object.hasOwn(app.devDependencies ?? {}, 'expo')
  ) {
    // expo prebuild copies the same sources when the app enables
    // nativeSource in withVxrn; fail fast while they are missing.
    if (!existsSync(join(root, 'android', 'app', 'src', 'main', 'java', 'one', 'source', sourceId))) {
      throw new Error(
        `[one] ${id} needs one prebuild, or Expo prebuild with nativeSource enabled in the vxrn config plugin and android generated`
      )
    }
  }
  const hash = renderKotlinSourceGlue(sourceId, contract).hash
  const oneRoot = dirname(requireFromFile.resolve('one/package.json'))
  const nativeSource = join(oneRoot, 'dist/esm/platform/native-source/index.native.js')
  const wireModule = join(oneRoot, 'dist/esm/platform/native-source/wire.native.js')
  const eventsModule = join(oneRoot, 'dist/esm/platform/native-source/events.native.js')
  const needsWire = contract.modules.some((module) => module.methods.some(methodWired))
  const needsEvents = contract.modules.some((module) => module.methods.some(methodSubscribed))
  const exports = contract.modules
    .map(
      (module) =>
        `export const ${module.name} = Object.freeze({${module.methods
          .map((method) => renderMethodCall(`${sourceId}.${module.name}`, method, hash))
          .join(',')}})`
    )
    .join('\n')
  const viewHost = join(oneRoot, 'dist/esm/platform/native-source/view.native.js')
  const views = contract.views
    .map(
      (view) =>
        `export function ${view.name}(props) { return createElement(KotlinSourceView, { source: ${JSON.stringify(sourceId)}, view: ${JSON.stringify(view.name)}, contractHash: ${JSON.stringify(hash)}, props${renderViewWires(view, contract.structs)} }) }`
    )
    .join('\n')
  if (!exports && !views) {
    throw new Error(`[one] ${id} has no OneModule object or public @Composable function to import`)
  }
  const code =
    [
      exports && `import { callNativeSource } from ${JSON.stringify(nativeSource)}`,
      needsWire &&
        `import { encodeNativeSourceArgs, decodeNativeSourceResult } from ${JSON.stringify(wireModule)}`,
      needsEvents &&
        `import { subscribeNativeSourceEvent } from ${JSON.stringify(eventsModule)}`,
      (needsWire || needsEvents) && `const nativeSourceStructs = ${JSON.stringify(contract.structs)}`,
      views &&
        `import { createElement } from 'react'\nimport { KotlinSourceView } from ${JSON.stringify(viewHost)}`,
      exports,
      views,
    ]
      .filter(Boolean)
      .join('\n') + '\n'
  // the module reads the source itself, so the bundler's watcher never sees it.
  return { code, watchFiles: [id] }
}
