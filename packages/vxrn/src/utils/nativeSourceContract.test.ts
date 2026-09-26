import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nativeSourceContract, writeNativeSourceDeclarations } from './nativeSourceContract'

const require = createRequire(import.meta.url)
const tsc = join(require.resolve('typescript/package.json'), '..', 'bin', 'tsc')

describe('native source contract', () => {
  it('derives matching typed exports from Swift and Kotlin module sources', () => {
    const swift = nativeSourceContract(
      '/app/native/Audio.swift',
      `@MainActor final class AudioMath: RNXModule {
  init() {}
  func rms(_ samples: [Double]) -> Double { 1 }
  func label(name: String) throws -> String { name }
}`
    )
    const kotlin = nativeSourceContract(
      '/app/native/Audio.kt',
      `object AudioMath : OneModule {
  fun rms(samples: List<Double>): Double = 1.0
  fun label(name: String): String = name
}`
    )

    expect(swift.modules).toEqual([
      {
        name: 'AudioMath',
        methods: [
          { name: 'rms', parameters: [{ name: 'samples', label: '_', type: 'number[]', nativeType: '[Double]' }], result: 'number', nativeResult: 'Double', throws: false, async: false },
          { name: 'label', parameters: [{ name: 'name', label: 'name', type: 'string', nativeType: 'String' }], result: 'string', nativeResult: 'String', throws: true, async: false },
        ],
      },
    ])
    expect(kotlin.modules).toEqual([
      {
        name: 'AudioMath',
        methods: [
          { name: 'rms', parameters: [{ name: 'samples', label: null, type: 'number[]', nativeType: 'List<Double>' }], result: 'number', nativeResult: 'Double', throws: true, async: false },
          { name: 'label', parameters: [{ name: 'name', label: null, type: 'string', nativeType: 'String' }], result: 'string', nativeResult: 'String', throws: true, async: false },
        ],
      },
    ])
    expect(swift.hash).toMatch(/^[a-f0-9]{64}$/)

    const temp = mkdtempSync(join(tmpdir(), 'one-native-source-types-'))
    writeFileSync(join(temp, 'Audio.d.swift.ts'), swift.declaration)
    writeFileSync(join(temp, 'Audio.d.kt.ts'), kotlin.declaration)
    writeFileSync(join(temp, 'tsconfig.json'), JSON.stringify({
      compilerOptions: {
        strict: true,
        noEmit: true,
        allowArbitraryExtensions: true,
        module: 'esnext',
        moduleResolution: 'bundler',
        types: [],
      },
      include: ['call.ts'],
    }))
    writeFileSync(join(temp, 'call.ts'), `import { AudioMath as Swift } from './Audio.swift'
import { AudioMath as Kotlin } from './Audio.kt'
const a: Promise<number> = Swift.rms([1, 2])
const b: Promise<string> = Kotlin.label('good')
void [a, b]
`)
    expect(spawnSync(process.execPath, [tsc, '-p', temp], { encoding: 'utf8' }).status).toBe(0)
    writeFileSync(join(temp, 'call.ts'), `import { AudioMath } from './Audio.swift'
AudioMath.rms('wrong')
`)
    const badCall = spawnSync(process.execPath, [tsc, '-p', temp], { encoding: 'utf8' })
    expect(badCall.status).not.toBe(0)
    expect(badCall.stdout).toMatch(/TS2345:.*string.*number\[\]/)
  })

  it('declares a Swift default view only from the file with @main', () => {
    const view = nativeSourceContract(
      '/app/native/Badge.swift',
      `@main struct Badge: RNXPackage {
  init() {}
  func view(props: JSON) -> some View { Text("badge") }
}`
    )
    expect(view.defaultView).toBe(true)
    expect(nativeSourceContract('/app/native/Helper.swift', 'struct Helper {}').defaultView).toBe(false)
  })

  it('rejects unsupported signatures at their source location', () => {
    expect(() =>
      nativeSourceContract(
        '/app/native/Audio.swift',
        `final class AudioMath: RNXModule {
  func unsupported(_ callback: () -> Void) -> Void {}
}`
      )
    ).toThrow(/Audio\.swift:2:.*unsupported/)
  })

  it('does not export a private method or hide the method after it', () => {
    const contract = nativeSourceContract('/app/native/Audio.swift', `final class AudioMath: RNXModule {
  private func key() -> String { "secret" }
  func label() -> String { "public" }
}`)
    expect(contract.modules[0].methods.map((method) => method.name)).toEqual(['label'])
  })

  it('generates adjacent declarations and removes only obsolete generated ones', () => {
    const root = mkdtempSync(join(tmpdir(), 'one-native-source-project-'))
    const source = join(root, 'Audio.swift')
    const declaration = join(root, 'Audio.d.swift.ts')
    writeFileSync(source, 'class Audio: RNXModule { func level() -> Int { 1 } }')
    writeNativeSourceDeclarations(root)
    expect(readFileSync(declaration, 'utf8')).toContain('level(): Promise<number>')
    writeFileSync(source, 'class Audio {}')
    writeNativeSourceDeclarations(root)
    expect(existsSync(declaration)).toBe(false)
    writeFileSync(declaration, 'declare const handWritten: true\n')
    writeNativeSourceDeclarations(root)
    expect(readFileSync(declaration, 'utf8')).toBe('declare const handWritten: true\n')
  })
})
