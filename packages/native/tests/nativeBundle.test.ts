import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { mkdtemp, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { runInNewContext } from 'node:vm'
import { transformSync } from 'esbuild'
import { rewriteDistSpecs } from '../codegen/staticSpecs'

const testDir = dirname(fileURLToPath(import.meta.url))
const packageDir = join(testDir, '..')
const specsDir = join(packageDir, 'src', 'specs')

// Behavioral gate for the static dist artifacts: real spec bytes through the
// real rewrite, staged the way the published dist lays them out, resolved and
// bundled by the real native bundler, then executed. No byte-shape assertions:
// the proof is which file the resolver loads and what the bundle registers.
describe('native bundle artifact', () => {
  it('resolves, bundles, and registers a static spec through buildNativeBundle', async () => {
    const name = 'OneNativeMenuNativeComponent.ts'
    const source = readFileSync(join(specsDir, name), 'utf8')
    const stage = await mkdtemp(join(tmpdir(), 'native-bundle-'))
    const seedDir = join(stage, 'seed')
    const distDir = join(stage, 'dist')
    mkdirSync(seedDir, { recursive: true })
    await writeFile(join(seedDir, name), source)
    for (const relative of [
      'esm/specs/OneNativeMenuNativeComponent.mjs',
      'esm/specs/OneNativeMenuNativeComponent.native.js',
    ]) {
      const mirror = join(distDir, relative)
      mkdirSync(dirname(mirror), { recursive: true })
      writeFileSync(mirror, transformSync(source, { loader: 'ts', format: 'esm' }).code)
    }
    expect(rewriteDistSpecs(seedDir, distDir)).toEqual({ specs: 1, mirrors: 2 })

    // Extensionless, the way adapters import specs; the load spy shows which
    // mirror the native resolver actually picks.
    await writeFile(
      join(stage, 'entry.js'),
      `import spec from './dist/esm/specs/OneNativeMenuNativeComponent'\nglobalThis.__loadedSpec = spec\n`
    )
    const probe = execFileSync('bun', [join(testDir, 'bundleProbe.ts'), stage], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    const { loaded } = JSON.parse(probe) as { loaded: string[] }
    const specLoads = loaded.filter((id) => id.includes('OneNativeMenuNativeComponent'))
    expect(specLoads.length).toBeGreaterThan(0)
    expect(
      specLoads.every((id) => id.endsWith('.native.js') || id.endsWith('.mjs'))
    ).toBe(true)

    const registered: Array<{ name: string; config: any }> = []
    const sandbox: Record<string, any> = {
      console,
      __DEV__: false,
      __RegistryStub: {
        get: (componentName: string, factory: () => any) => {
          registered.push({ name: componentName, config: factory() })
          return componentName
        },
      },
      module: { exports: {} },
      exports: {},
      // The static bundle is self-contained apart from the stubbed RN leaves;
      // any runtime require is a surprise worth failing on.
      require: (id: string) => {
        throw new Error(`unexpected runtime require: ${id}`)
      },
    }
    sandbox.exports = sandbox.module.exports
    runInNewContext(readFileSync(join(stage, 'bundle.js'), 'utf8'), sandbox)
    expect(registered.map((entry) => entry.name)).toEqual(['OneNativeMenu'])
    const config = registered[0].config
    expect(config.validAttributes.items).toBe(true)
    expect(config.validAttributes.triggerLabel).toBe(true)
    expect(config.directEventTypes.topNativeMenuAction.registrationName).toBe(
      'onNativeMenuAction'
    )
  }, 120_000)

  it('ships both raw specs and static dist for pack consumers', () => {
    const manifest = JSON.parse(readFileSync(join(packageDir, 'package.json'), 'utf8')) as {
      files: string[]
    }
    expect(manifest.files).toContain('src')
    expect(manifest.files).toContain('dist')
    expect(existsSync(join(packageDir, 'src', 'specs', 'OneNativeMenuNativeComponent.ts'))).toBe(
      true
    )
  })
})
