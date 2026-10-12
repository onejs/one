// Test harness: bundles a staged fixture through the real native bundler and
// reports which files it loaded. Runs under bun (not node), which resolves the
// sibling workspace TypeScript directly. Only consumed by nativeBundle.test.ts.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const require = createRequire(import.meta.url)
const { buildNativeBundle } = require('../../vxrn/src/utils/createNativeDevEngine.ts')

const [stage] = process.argv.slice(2)
const loaded: string[] = []
const { code } = await buildNativeBundle({
  root: stage,
  platform: 'ios',
  entryFile: 'entry.js',
  dev: false,
  serverUrl: 'http://localhost:8081',
  plugins: [
    {
      name: 'load-spy',
      transform(_code: string, id: string) {
        loaded.push(id)
        return null
      },
    },
    // The device runtime provides React Native; stub the two leaf modules our
    // static output touches so the bundle executes in a bare VM. A load hook
    // (not resolveId: One's own resolver hook runs first) that answers the
    // resolved RN paths with stubs. Everything else bundles for real.
    {
      name: 'stub-rn',
      load(id: string) {
        // Same export shapes as the real modules: the static output takes the
        // registry object whole (`const X = require(...)`) and destructures
        // the ignore helper out of its module.
        if (id.endsWith('/Libraries/NativeComponent/NativeComponentRegistry.js')) {
          return 'export function get(name, factory) { return globalThis.__RegistryStub.get(name, factory) }'
        }
        if (id.endsWith('/Libraries/NativeComponent/ViewConfigIgnore.js')) {
          return 'export function ConditionallyIgnoredEventHandlers(config) { return config }'
        }
        return null
      },
    },
  ],
})
writeFileSync(join(stage, 'bundle.js'), code)
console.log(JSON.stringify({ loaded }))
