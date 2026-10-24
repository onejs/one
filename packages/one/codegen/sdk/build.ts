// bundles the sdk generator app for shipping: app.ts and its relative imports
// into dist/sdk/app.mjs (node, esm). a build-time plugin bakes the generator
// fingerprint in as a constant computed from source, so the bundle hashes
// identically without reading generator sources at runtime. the package build
// (no output argument) also compiles committed ios-bindings facades to
// dist/esm/ios, the javascript native consumers resolve for one/ios/<Framework>.
import { mkdirSync, readFileSync, readdirSync, renameSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'
import { compactFacade } from './compact'

const dir = dirname(fileURLToPath(import.meta.url))
const fingerprintPath = join(dir, 'fingerprint.ts')
const escaped = fingerprintPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

export async function buildSdkApp(
  outdir = join(dir, '../../dist/sdk')
): Promise<{ path: string; fingerprint: string }> {
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
  if (!result.success)
    throw new Error(`sdk app bundle failed:\n${result.logs.join('\n')}`)
  const built = result.outputs[0]?.path
  if (!built) throw new Error('sdk app bundle produced no output')
  const path = join(outdir, 'app.mjs')
  if (built !== path) renameSync(built, path)
  return { path, fingerprint }
}

// per file, imports untouched: facades import one/ios-runtime and each other
// through package exports, so every framework stays one module per specifier.
export async function buildIosFacades(
  outdir = join(dir, '../../dist/esm/ios')
): Promise<number> {
  const bindings = join(dir, '../../ios-bindings')
  const facades = readdirSync(bindings).filter((name) => name.endsWith('.ts'))
  mkdirSync(outdir, { recursive: true })
  await Promise.all(
    facades.map(async (name) => {
      const { code } = await transform(
        compactFacade(readFileSync(join(bindings, name), 'utf8')),
        {
          loader: 'ts',
          format: 'esm',
          target: 'es2020',
          minifyWhitespace: true,
          minifySyntax: true,
          minifyIdentifiers: false,
          legalComments: 'none',
        }
      )
      writeFileSync(join(outdir, `${name.slice(0, -3)}.native.js`), code)
    })
  )
  return facades.length
}

if (import.meta.main) {
  const outdir = process.argv[2]
  const { path, fingerprint } = await buildSdkApp(outdir)
  console.log(`sdk app: ${path} ${fingerprint.slice(0, 16)}`)
  if (outdir === undefined) {
    console.log(`ios facades: ${await buildIosFacades()} compiled`)
  }
}
