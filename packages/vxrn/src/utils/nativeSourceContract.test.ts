import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nativeSourceContract, renderKotlinSourceGlue, swiftPodManifest, writeNativeSourceDeclarations } from './nativeSourceContract'

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
Swift.rms('wrong')
`)
    // one compilation must accept the valid calls and reject only the wrong argument.
    const badCall = spawnSync(process.execPath, [tsc, '-p', temp], { encoding: 'utf8' })
    expect(badCall.status).toBe(1)
    expect(badCall.stdout.match(/error TS\d+:/g)).toEqual(['error TS2345:'])
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

  it('imports public Kotlin composables as typed components with callbacks', () => {
    const contract = nativeSourceContract(
      '/app/native/Counter.kt',
      `package app.counter
@Composable
fun Counter(title: String, subtitle: String? = null, onTap: () -> Unit, onPick: ((Int) -> Unit)? = null, modifier: Modifier = Modifier) {
  Text(title)
}
@Composable private fun Hidden() {}
fun helper(x: Int) = x`
    )
    expect(contract.views).toEqual([
      {
        name: 'Counter',
        props: [
          { name: 'title', type: 'string', nativeType: 'String', optional: false, callback: null },
          { name: 'subtitle', type: 'string | null', nativeType: 'String?', optional: true, callback: null },
          { name: 'onTap', type: '() => void', nativeType: '()->Unit', optional: false, callback: [] },
          { name: 'onPick', type: '((value0: number) => void) | null', nativeType: '((Int)->Unit)?', optional: true, callback: [{ type: 'number', nativeType: 'Int' }] },
        ],
      },
    ])
    const glue = renderKotlinSourceGlue('K_counter', contract).source
    expect(glue).toContain('class OneNativeSourceViews_K_counter: OneNativeSourceViewDispatch')
    expect(glue).toContain('onPick = if (props.optBoolean("onPick")) ({ a0 -> emit("onPick"')
    expect(() =>
      nativeSourceContract('/app/native/Bad.kt', '@Composable\nfun Bad(count: Int = 1) {}')
    ).toThrow(/Bad\.kt:2:.*may only default to null/)
    expect(() =>
      nativeSourceContract('/app/native/Bad.kt', '@Composable\nfun Bad(onTap: () -> Int) {}')
    ).toThrow(/must return Unit/)
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

  it('reads modifiers from the method alone, not from a property declared above it', () => {
    const swift = nativeSourceContract('/app/native/Audio.swift', `final class AudioMath: RNXModule {
  private var hits = 0
  static let shared = AudioMath()
  @available(iOS 17, *) func rms(_ samples: [Double]) -> Double { 0 }
}`)
    expect(swift.modules[0].methods.map((method) => method.name)).toEqual(['rms'])
    const kotlin = nativeSourceContract('/app/native/Audio.kt', `package app.audio
import dev.onejs.one.source.OneModule
object AudioMath : OneModule {
    private var hits = 0
    fun rms(samples: List<Double>): Double = samples.sum()
    private val scale = 2
    suspend fun later(ms: Int): String = "slept"
}`)
    expect(kotlin.modules[0].methods.map((method) => [method.name, method.async])).toEqual([['rms', false], ['later', true]])
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

  it('uses the declared Swift language mode and rejects dependencies a pod cannot link', () => {
    expect(swiftPodManifest('Package.swift', `let package = Package(
      targets: [.executableTarget(name: "App", swiftSettings: [.swiftLanguageMode(.v6), .defaultIsolation(MainActor.self)])]
    )`)).toEqual({ languageMode: 6, mainActorIsolation: true })
    expect(swiftPodManifest('Package.swift', 'let package = Package(name: "App")').languageMode).toBe(5)
    expect(() => swiftPodManifest('Package.swift', `let package = Package(dependencies: [.package(url: "https://example.com/third-party.git", from: "1.0.0")])`)).toThrow(/SwiftPM package dependencies/)
  })
})
