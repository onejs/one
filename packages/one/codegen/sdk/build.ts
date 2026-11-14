// bundles the sdk generator app for shipping: app.ts and its relative imports
// into dist/sdk/app.mjs (node, esm). a build-time plugin bakes the generator
// fingerprint in as a constant computed from source, so the bundle hashes
// identically without reading generator sources at runtime. the package build
// (no output argument) also compiles committed ios-bindings facades to
// dist/esm/ios, the javascript native consumers resolve for one/ios/<Framework>.
import {
  mkdirSync,
  rmSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { transform } from 'esbuild'
import { compactFacade } from './compact'
import { splitFacade } from './split-facade'

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

// preserve the full framework registry while letting internal imports select classes.
export async function buildIosFacades(
  outdir = join(dir, '../../dist/esm/ios')
): Promise<number> {
  const bindings = join(dir, '../../ios-bindings')
  const facades = readdirSync(bindings).filter((name) => name.endsWith('.ts'))
  rmSync(outdir, { recursive: true, force: true })
  mkdirSync(outdir, { recursive: true })
  const types = join(dir, '../../dist/ios-types')
  rmSync(types, { recursive: true, force: true })
  mkdirSync(types, { recursive: true })
  await Promise.all(
    facades.map(async (name) => {
      const { code } = await transform(
        compactFacade(readFileSync(join(bindings, name), 'utf8')),
        {
          loader: 'ts',
          format: 'esm',
          target: 'es2020',
          minifyWhitespace: true,
          minifySyntax: false,
          minifyIdentifiers: false,
          legalComments: 'none',
        }
      )
      const framework = name.slice(0, -3)
      const modules = splitFacade(code)
      const directory = join(outdir, framework)
      mkdirSync(directory, { recursive: true })
      const typeDirectory = join(types, framework)
      mkdirSync(typeDirectory, { recursive: true })
      const declaration = join(dir, '../../ios-types', framework)
      writeFileSync(
        join(types, framework + '.d.ts'),
        'export * from ' + JSON.stringify(relative(types, declaration)) + ';\n'
      )
      for (const [name, source] of modules) {
        writeFileSync(join(directory, name + '.mjs'), source)
        if (name === '_calls' || name === '_protocols' || name === 'index') continue
        const names = source.match(/export \{ ([^}]+) \};\n$/)?.[1]
        if (names)
          writeFileSync(
            join(typeDirectory, name + '.d.ts'),
            'export { ' +
              names +
              ' } from ' +
              JSON.stringify(relative(typeDirectory, declaration)) +
              ';\n'
          )
      }
      writeFileSync(
        join(outdir, framework + '.mjs'),
        'export * from "./' + framework + '/index.mjs";\n'
      )
    })
  )
  return facades.length
}

if (import.meta.main) {
  const outdir = process.argv[2] === '--skip-types' ? undefined : process.argv[2]
  const { path, fingerprint } = await buildSdkApp(outdir)
  console.log(`sdk app: ${path} ${fingerprint.slice(0, 16)}`)
  if (outdir === undefined) {
    const manifest = JSON.parse(
      readFileSync(join(dir, '../../ios-bindings/manifest.json'), 'utf8')
    )
    if (manifest.generation !== fingerprint.slice(0, 16))
      throw new Error(
        `ios-bindings generation ${manifest.generation} does not match the sdk generator ${fingerprint.slice(0, 16)}; regenerate the facades before building`
      )
    console.log(`ios facades: ${await buildIosFacades()} compiled`)
  }
}
