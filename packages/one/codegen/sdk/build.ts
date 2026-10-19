// bundles the sdk generator app for shipping: app.ts and its relative imports
// into dist/sdk/app.mjs (node, esm). a build-time plugin bakes the generator
// fingerprint in as a constant computed from source, so the bundle hashes
// identically without reading generator sources at runtime.
import { renameSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = dirname(fileURLToPath(import.meta.url))
const fingerprintPath = join(dir, 'fingerprint.ts')
const escaped = fingerprintPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function buildSdkApp(outdir = join(dir, '../../dist/sdk')): Promise<{ path: string; fingerprint: string }> {
  const { generatorFingerprint } = await import('./fingerprint.ts')
  const fingerprint = generatorFingerprint()
  const result = await Bun.build({
    entrypoints: [join(dir, 'app.ts')],
    outdir,
    target: 'node',
    format: 'esm',
    plugins: [
      {
        name: 'fingerprint-constant',
        setup(build) {
          build.onLoad({ filter: new RegExp(`${escaped}$`) }, () => ({
            contents: `export function generatorFingerprint() { return ${JSON.stringify(fingerprint)} }\n`,
            loader: 'ts',
          }))
        },
      },
    ],
  })
  if (!result.success) throw new Error(`sdk app bundle failed:\n${result.logs.join('\n')}`)
  const built = result.outputs[0]?.path
  if (!built) throw new Error('sdk app bundle produced no output')
  const path = join(outdir, 'app.mjs')
  if (built !== path) renameSync(built, path)
  return { path, fingerprint }
}

if (import.meta.main) {
  const { path, fingerprint } = await buildSdkApp(process.argv[2])
  console.log(`sdk app: ${path} ${fingerprint.slice(0, 16)}`)
}
