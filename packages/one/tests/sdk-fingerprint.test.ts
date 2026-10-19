import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { fingerprintForRoot, generatorFingerprint, hashInputs, inputFiles } from '../codegen/sdk/fingerprint'

const pkgRoot = join(__dirname, '..')
const buildScript = join(__dirname, '../codegen/sdk/build.ts')
const roots: string[] = []
const scratch = (prefix: string) => {
  const root = mkdtempSync(join(tmpdir(), prefix))
  roots.push(root)
  return root
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

// a scratch package root mirroring the fingerprint inputs, for controls that
// must not touch the checkout
function stageRoot(mutate?: (files: Map<string, string>) => void): string {
  const root = scratch('one-fingerprint-')
  const files = new Map(inputFiles().map((name) => [name, readFileSync(join(pkgRoot, name), 'utf8')]))
  files.set('schema.json', readFileSync(join(pkgRoot, 'schema.json'), 'utf8'))
  files.set('package.json', readFileSync(join(pkgRoot, 'package.json'), 'utf8'))
  mutate?.(files)
  for (const [name, content] of files) {
    const path = join(root, name)
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, content)
  }
  return root
}

function buildBundle(outdir: string): string {
  execFileSync('bun', [buildScript, outdir], { encoding: 'utf8' })
  return join(outdir, 'app.mjs')
}

describe('sdk generator fingerprint', () => {
  it('is a stable full sha256', () => {
    const first = generatorFingerprint()
    expect(first).toMatch(/^[0-9a-f]{64}$/)
    expect(generatorFingerprint()).toBe(first)
  })

  it('invalidates on changed inputs but not order', () => {
    const base = [
      { name: 'b.ts', content: 'two' },
      { name: 'a.ts', content: 'one' },
    ]
    const hash = hashInputs(base)
    expect(hashInputs([...base].reverse())).toBe(hash)
    expect(hashInputs([{ name: 'a.ts', content: 'one!' }, base[0]])).not.toBe(hash)
    expect(hashInputs([{ name: 'a.ts', content: 'one' }])).not.toBe(hash)
  })

  it('ignores version-only manifest changes', () => {
    const root = stageRoot((files) => {
      const manifest = JSON.parse(files.get('package.json')!)
      manifest.version = '9.9.9-canary.1'
      files.set('package.json', JSON.stringify(manifest))
    })
    expect(fingerprintForRoot(root)).toBe(generatorFingerprint())
  })

  it('invalidates on real source and runtime changes', () => {
    const source = stageRoot((files) => {
      files.set('codegen/sdk/bridge.ts', `${files.get('codegen/sdk/bridge.ts')}\n// control\n`)
    })
    expect(fingerprintForRoot(source)).not.toBe(generatorFingerprint())
    const runtime = stageRoot((files) => {
      files.set('ios/SDK/OneSDKRuntime.swift', `${files.get('ios/SDK/OneSDKRuntime.swift')}\n// control\n`)
    })
    expect(fingerprintForRoot(runtime)).not.toBe(generatorFingerprint())
  })

  it('tracks schema minimumVersion but not control changes', () => {
    const controls = stageRoot((files) => {
      const schema = JSON.parse(files.get('schema.json')!)
      schema.components.push({ name: 'ControlProbe', publicName: 'Probe', props: {} })
      files.set('schema.json', JSON.stringify(schema))
    })
    expect(fingerprintForRoot(controls)).toBe(generatorFingerprint())
    const floor = stageRoot((files) => {
      const schema = JSON.parse(files.get('schema.json')!)
      schema.minimumVersion += 1
      files.set('schema.json', JSON.stringify(schema))
    })
    expect(fingerprintForRoot(floor)).not.toBe(generatorFingerprint())
  })

  it('resolves without the sdk toolchain', () => {
    const out = execFileSync(
      process.execPath,
      ['-e', 'import(process.argv[1]).then((m) => console.log(m.generatorFingerprint()))',
        join(pkgRoot, 'codegen/sdk/fingerprint.ts')],
      { cwd: tmpdir(), encoding: 'utf8' }
    ).trim()
    expect(out).toBe(generatorFingerprint())
  })
})

describe('sdk app bundle', () => {
  it('embeds the source fingerprint as a constant', () => {
    const path = buildBundle(scratch('one-sdk-app-'))
    const text = readFileSync(path, 'utf8')
    expect(text).toContain(generatorFingerprint())
    expect(text).not.toContain('.worktrees/')
  })

  it('builds deterministically and imports standalone', async () => {
    const a = buildBundle(scratch('one-sdk-app-'))
    const b = buildBundle(scratch('one-sdk-app-'))
    expect(readFileSync(a, 'utf8')).toBe(readFileSync(b, 'utf8'))
    const bundle = (await import(a)) as Record<string, unknown>
    for (const name of ['SDK_POD', 'importedFrameworks', 'generateAppSdk', 'writeAppSdkPod']) {
      expect(bundle[name], name).toBeDefined()
    }
  })
})
