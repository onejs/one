import { spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { nativeSourceContract, renderKotlinSourceGlue, renderSwiftSourceGlue, swiftPodManifest, writeNativeSourceDeclarations } from './nativeSourceContract'

const require = createRequire(import.meta.url)
const tsc = join(require.resolve('typescript/package.json'), '..', 'bin', 'tsc')

describe('native source contract', () => {
  it('types optional collection elements as nullable array members', () => {
    const swift = nativeSourceContract(
      '/app/native/Echo.swift',
      `@MainActor final class Echo: PeachModule {
  init() {}
  func echo(_ values: [String?]) -> [String?] { values }
}`
    )
    const kotlin = nativeSourceContract(
      '/app/native/Echo.kt',
      `object Echo : OneModule {
  fun echo(values: List<String?>): List<String?> = values
}`
    )
    for (const contract of [swift, kotlin]) {
      const [method] = contract.modules[0].methods
      expect(method.parameters[0].type).toBe('(string | null)[]')
      expect(method.result).toBe('(string | null)[]')
    }
  })

  it('derives matching typed exports from Swift and Kotlin module sources', () => {
    const swift = nativeSourceContract(
      '/app/native/Audio.swift',
      `@MainActor final class AudioMath: PeachModule {
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
      `@main struct Badge: PeachPackage {
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

  it('imports public Swift views as typed components with callbacks', () => {
    const contract = nativeSourceContract(
      '/app/native/Level.swift',
      `import SwiftUI
public struct Level: View {
  let value: Double
  var caption: String? = nil
  let onChange: (Double) -> Void
  let onReset: (() -> Void)?
  @State private var dragging = false
  @Environment(\\.colorScheme) var scheme
  private let step = 0.1
  static let shared = 1
  var body: some View { Text("level") }
}
struct Helper: View {
  let anything: Int
  var body: some View { EmptyView() }
}`
    )
    expect(contract.views).toEqual([
      {
        name: 'Level',
        props: [
          { name: 'value', type: 'number', nativeType: 'Double', optional: false, callback: null },
          { name: 'caption', type: 'string | null', nativeType: 'String?', optional: true, callback: null },
          { name: 'onChange', type: '(value0: number) => void', nativeType: '(Double)->Void', optional: false, callback: [{ type: 'number', nativeType: 'Double' }] },
          { name: 'onReset', type: '(() => void) | null', nativeType: '(()->Void)?', optional: true, callback: [] },
        ],
      },
    ])
    const glue = renderSwiftSourceGlue('rn_host_app', [contract]).source
    expect(glue).toContain('@objc(OneNativeSourceViews_rn_host_app) @MainActor public final class OneNativeSourceViews_rn_host_app: NSObject, OneNativeSourceViewDispatch')
    expect(glue).toContain('value: try decode(props["value"] ?? missing("props.value"), as: Double.self),')
    expect(glue).toContain('onReset: (props["onReset"] as? Bool) == true ? { () -> Void in emit("onReset", args([])) } : nil')

    const temp = mkdtempSync(join(tmpdir(), 'one-native-source-views-'))
    writeFileSync(join(temp, 'Level.d.swift.ts'), contract.declaration)
    writeFileSync(join(temp, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { strict: true, noEmit: true, allowArbitraryExtensions: true, module: 'esnext', moduleResolution: 'bundler', types: [] },
      include: ['use.ts'],
    }))
    writeFileSync(join(temp, 'react.d.ts'), "declare module 'react' { export interface ReactElement {} }")
    writeFileSync(join(temp, 'use.ts'), `/// <reference path="./react.d.ts" />
import { Level } from './Level.swift'
Level({ value: 1, onChange: (next: number) => void next, onReset: null })
Level({ value: 'wrong', onChange: () => {} })
`)
    // one compilation must accept the valid element and reject only the wrong prop.
    const badProp = spawnSync(process.execPath, [tsc, '-p', temp], { encoding: 'utf8' })
    expect(badProp.stdout.match(/error TS\d+:/g)).toEqual(['error TS2322:'])

    for (const [source, message] of [
      ['public struct Bad: View {\n  @Binding var value: Double\n  var body: some View { EmptyView() }\n}', /Bad\.swift:2:.*@Binding value in view Bad needs a value/],
      ['public struct Bad: View {\n  private let value: Double\n  var body: some View { EmptyView() }\n}', /Bad\.swift:2:.*private value in view Bad needs a value/],
      ['public struct Bad: View {\n  var count: Int = 1\n  var body: some View { EmptyView() }\n}', /Bad\.swift:2:.*may only default to nil/],
      ['public struct Bad: View {\n  let value: Int\n  init(value: Int) { self.value = value }\n  var body: some View { EmptyView() }\n}', /Bad\.swift:3:.*memberwise initializer/],
      ['public struct Bad<T>: View {\n  var body: some View { EmptyView() }\n}', /Bad\.swift:1:.*generic view Bad/],
      ['public struct Bad: View {\n  let onTap: () -> Int\n  var body: some View { EmptyView() }\n}', /must return Void/],
    ] as const) {
      expect(() => nativeSourceContract('/app/native/Bad.swift', source)).toThrow(message)
    }
  })

  it('keeps the objc dispatch class off wasi, whose sdk mirrors objectivec', () => {
    const contract = nativeSourceContract(
      '/app/native/Audio.swift',
      `@MainActor final class AudioMath: PeachModule {
  init() {}
  func rms(_ samples: [Double]) -> Double { 1 }
}`
    )
    const glue = renderSwiftSourceGlue('rn_host_app', [contract]).source
    expect(glue).toContain('#if canImport(ObjectiveC) && !os(WASI)')
  })

  it('rejects unsupported signatures at their source location', () => {
    expect(() =>
      nativeSourceContract(
        '/app/native/Audio.swift',
        `final class AudioMath: PeachModule {
  func unsupported(_ id: String, _ callback: () -> Void) -> Void {}
}`
      )
    ).toThrow(/Audio\.swift:2:.*unsupported/)
  })

  it('does not export a private method or hide the method after it', () => {
    const contract = nativeSourceContract('/app/native/Audio.swift', `final class AudioMath: PeachModule {
  private func key() -> String { "secret" }
  func label() -> String { "public" }
}`)
    expect(contract.modules[0].methods.map((method) => method.name)).toEqual(['label'])
  })

  it('reads modifiers from the method alone, not from a property declared above it', () => {
    const swift = nativeSourceContract('/app/native/Audio.swift', `final class AudioMath: PeachModule {
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
    writeFileSync(source, 'class Audio: PeachModule { func level() -> Int { 1 } }')
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

describe('native source events', () => {
  const swiftEvents = `@MainActor final class Clock: PeachModule {
  init() {}

  func onTick(_ callback: @escaping (Double) -> Void) {}
  func onReady(_ callback: () -> Void) {}
  func now() -> Double { 1 }
}
`
  const kotlinEvents = `object Clock : OneModule {
    fun onTick(callback: (Double) -> Unit) {}
    fun onReady(callback: () -> Unit) {}
    fun now(): Double = 1.0
}
`

  it('marks single-callback void methods as subscriptions on both platforms', () => {
    const swift = nativeSourceContract('/app/native/Clock.swift', swiftEvents)
    const kotlin = nativeSourceContract('/app/native/Clock.kt', kotlinEvents)
    for (const contract of [swift, kotlin]) {
      const [onTick, onReady, now] = contract.modules[0].methods
      expect(onTick.parameters).toEqual([])
      expect(onTick.result).toBe('void')
      expect(onTick.subscription).toEqual({
        payload: [{ type: 'number', nativeType: 'Double', wire: undefined }],
      })
      expect(onReady.subscription).toEqual({ payload: [] })
      expect(now.subscription).toBeUndefined()
    }
    expect(swift.declaration).toContain('onTick(listener: (value0: number) => void): () => void')
    expect(swift.declaration).toContain('onReady(listener: () => void): () => void')
    expect(swift.declaration).toContain('now(): Promise<number>')
  })

  it('renders subscribe cases that hand the native closure to the author', () => {
    const swift = nativeSourceContract('/app/native/Clock.swift', swiftEvents)
    const glue = renderSwiftSourceGlue('clock_pkg', [swift]).source
    expect(glue).toContain('let channel = "OneNativeSource.clock_pkg.Clock.onTick"')
    expect(glue).toContain(
      'ClockInstance.onTick({ (a0: Double) in postEvent(channel, args([a0])) })'
    )
    expect(glue).toContain('ClockInstance.onReady({ postEvent(channel, args([])) })')
    expect(glue).toContain('OneNativeSourceEmitter.send(channel, args)')

    const kotlin = nativeSourceContract('/app/native/Clock.kt', kotlinEvents)
    const kotlinGlue = renderKotlinSourceGlue('K_clock', kotlin).source
    expect(kotlinGlue).toContain('import dev.onejs.one.source.OneNativeSourceEvents')
    expect(kotlinGlue).toContain(
      'Clock.onTick({ a0 -> OneNativeSourceEvents.send("OneNativeSource.K_clock.Clock.onTick", JSONArray().put(JSONObject.wrap(a0)).toString()) })'
    )
    expect(kotlinGlue).toContain(
      'Clock.onReady({ OneNativeSourceEvents.send("OneNativeSource.K_clock.Clock.onReady", JSONArray().toString()) })'
    )
  })

  it('rejects callbacks that cannot subscribe', () => {
    // a nullable callback is not a subscription; the call path rejects it
    expect(() =>
      nativeSourceContract(
        '/app/native/Clock.swift',
        'final class Clock: PeachModule {\n  func onTick(_ callback: ((Double) -> Void)?) {}\n}'
      )
    ).toThrow(/unsupported native export type/)
    // a callback beside other parameters is not a subscription either
    expect(() =>
      nativeSourceContract(
        '/app/native/Clock.kt',
        'object Clock : OneModule {\n    fun watch(id: String, callback: (Double) -> Unit) {}\n}'
      )
    ).toThrow(/unsupported native export type/)
    // a subscription must return nothing to unsubscribe into
    expect(() =>
      nativeSourceContract(
        '/app/native/Clock.swift',
        'final class Clock: PeachModule {\n  func onTick(_ callback: (Double) -> Void) -> Bool { true }\n}'
      )
    ).toThrow(/unsupported native export type/)
  })
})

describe('native source structs, enums, dates and data', () => {
  const swiftSource = `struct Point: Codable {
  var x: Double
  var y: Double
  var label: String? = nil
}

enum Direction: String, Codable {
  case north
  case south
}

@MainActor final class Atlas: PeachModule {
  init() {}

  func pin(_ point: Point) -> Point { point }
  func heading(_ direction: Direction) -> Direction { direction }
  func at(_ when: Date) -> Date { when }
  func blob(_ data: Data) -> Data { data }
  func pins(_ points: [Point]) -> [String: Date] { [:] }
}
`
  const kotlinSource = `package app.atlas

data class Point(val x: Double, val y: Double, val label: String? = null)

enum class Direction {
    NORTH,
    SOUTH
}

object Atlas : OneModule {
    fun pin(point: Point): Point = point
    fun heading(direction: Direction): Direction = direction
    fun at(when: Date): Date = when
    fun blob(data: ByteArray): ByteArray = data
    fun pins(points: List<Point>): Map<String, Date> = mapOf()
}
`

  it('types struct, enum, date and data payloads on both platforms', () => {
    const swift = nativeSourceContract('/app/native/Atlas.swift', swiftSource)
    const kotlinContract = nativeSourceContract('/app/native/Atlas.kt', kotlinSource)
    for (const contract of [swift, kotlinContract]) {
      const [pin, heading, at, blob, pins] = contract.modules[0].methods
      expect(pin.parameters[0].type).toBe('Point')
      expect(pin.parameters[0].wire).toEqual({ kind: 'struct', name: 'Point' })
      expect(pin.result).toBe('Point')
      expect(heading.parameters[0].type).toBe('Direction')
      expect(at.parameters[0].type).toBe('Date')
      expect(at.parameters[0].wire).toEqual({ kind: 'date' })
      expect(blob.parameters[0].type).toBe('Uint8Array')
      expect(blob.parameters[0].wire).toEqual({ kind: 'data' })
      expect(pins.parameters[0].wire).toEqual({ kind: 'array', element: { kind: 'struct', name: 'Point' } })
      expect(pins.resultWire).toEqual({ kind: 'map', value: { kind: 'date' } })
    }
    expect(swift.structs).toEqual([
      {
        name: 'Point',
        fields: [
          { name: 'x', type: 'number', nativeType: 'Double', optional: false, wire: undefined, fallback: undefined },
          { name: 'y', type: 'number', nativeType: 'Double', optional: false, wire: undefined, fallback: undefined },
          { name: 'label', type: 'string | null', nativeType: 'String?', optional: true, wire: undefined, fallback: undefined },
        ],
      },
    ])
    expect(swift.enums).toEqual([
      { name: 'Direction', backing: 'string', cases: [{ name: 'north', value: 'north' }, { name: 'south', value: 'south' }] },
    ])
    expect(kotlinContract.structs[0].fields.map((field) => [field.name, field.type, field.optional])).toEqual([
      ['x', 'number', false],
      ['y', 'number', false],
      ['label', 'string | null', true],
    ])
    expect(kotlinContract.enums).toEqual([
      { name: 'Direction', backing: 'string', cases: [{ name: 'NORTH', value: 'NORTH' }, { name: 'SOUTH', value: 'SOUTH' }] },
    ])
    expect(swift.declaration).toContain('export interface Point { x: number; y: number; label?: string | null; }')
    expect(swift.declaration).toContain('export type Direction = "north" | "south"')
  })

  it('reads qualified stdlib spellings as the same types', () => {
    const swift = nativeSourceContract(
      '/app/native/Atlas.swift',
      'final class Atlas: PeachModule {\n  func at(_ when: Foundation.Date) -> Foundation.Date { when }\n  func blob(_ data: Foundation.Data) -> Foundation.Data { data }\n}'
    )
    expect(swift.modules[0].methods[0].parameters[0].type).toBe('Date')
    expect(swift.modules[0].methods[0].parameters[0].wire).toEqual({ kind: 'date' })
    expect(swift.modules[0].methods[1].parameters[0].type).toBe('Uint8Array')
    const kotlin = nativeSourceContract(
      '/app/native/Atlas.kt',
      'object Atlas : OneModule {\n    fun at(moment: java.util.Date): java.util.Date = moment\n}'
    )
    expect(kotlin.modules[0].methods[0].parameters[0].type).toBe('Date')
    expect(renderKotlinSourceGlue('K_atlas', kotlin).source).toContain('readDate(args.get(0), "args[0]")')
  })

  it('rejects unusable named types at their use site', () => {
    const cases = [
      ['struct Plain {\n  var x: Double\n}\nfinal class Atlas: PeachModule {\n  func pin(_ point: Plain) -> Double { 1 }\n}', /must conform to Codable/],
      ['struct Box<T: Codable> {\n  var boxed: T\n}\nfinal class Atlas: PeachModule {\n  func pin(_ point: Box<Double>) -> Double { 1 }\n}', /unsupported native export type/],
      ['enum Shape {\n  case circle(Double)\n}\nfinal class Atlas: PeachModule {\n  func draw(_ shape: Shape) -> Double { 1 }\n}', /needs a String or Int backing/],
      ['enum Direction: String {\n  case north\n}\nfinal class Atlas: PeachModule {\n  func heading(_ direction: Direction) -> Double { 1 }\n}', /must conform to Codable/],
      ['enum Level: Int, Codable {\n  case low\n  case high\n}\nfinal class Atlas: PeachModule {\n  func rank(_ level: Level) -> Double { 1 }\n}', null],
      ['final class Atlas: PeachModule {\n  func pin(_ point: Point) -> Double { 1 }\n}', /unsupported native export type Point/],
      ['private struct Point: Codable {\n  var x: Double\n}\nfinal class Atlas: PeachModule {\n  func pin(_ point: Point) -> Double { 1 }\n}', /private to its file/],
    ] as const
    for (const [source, message] of cases) {
      if (message === null) {
        const contract = nativeSourceContract('/app/native/Atlas.swift', source)
        expect(contract.enums).toEqual([
          { name: 'Level', backing: 'number', cases: [{ name: 'low', value: 0 }, { name: 'high', value: 1 }] },
        ])
        expect(contract.declaration).toContain('export type Level = 0 | 1')
      } else {
        expect(() => nativeSourceContract('/app/native/Atlas.swift', source)).toThrow(message)
      }
    }
    expect(() =>
      nativeSourceContract('/app/native/Atlas.kt', 'private data class Point(val x: Double)\nobject Atlas : OneModule {\n    fun pin(point: Point): Double = 1.0\n}')
    ).toThrow(/must be public/)
    expect(() =>
      nativeSourceContract('/app/native/Atlas.kt', 'data class Point(val tap: (Double) -> Unit)\nobject Atlas : OneModule {\n    fun pin(point: Point): Double = 1.0\n}')
    ).toThrow(/unsupported native export type/)
  })

  it('leaves view-only files untouched when no method uses a named type', () => {
    const contract = nativeSourceContract(
      '/app/native/Level.swift',
      `import SwiftUI
public struct Level: View {
  let value: Double
  let onChange: (Double) -> Void
  public var body: some View { Text("") }
}
@MainActor final class AudioMath: PeachModule {
  init() {}
  func rms(_ samples: [Double]) -> Double { 1 }
}`
    )
    expect(contract.structs).toEqual([])
    expect(contract.enums).toEqual([])
    expect(contract.modules[0].methods[0].parameters[0].wire).toBeUndefined()
    expect(contract.modules[0].methods[0].resultWire).toBeUndefined()
  })

  it('renders iso dates and struct helpers into both glues', () => {
    const swift = nativeSourceContract('/app/native/Atlas.swift', swiftSource)
    const glue = renderSwiftSourceGlue('atlas_pkg', [swift]).source
    expect(glue).toContain('decoder.dateDecodingStrategy = .custom { try decodeDate($0) }')
    expect(glue).toContain('encoder.dateEncodingStrategy = .iso8601')
    expect(glue).toContain('decode(values[0], as: Point.self)')
    expect(glue).toContain('return try encode(result)')

    const kotlin = nativeSourceContract('/app/native/Atlas.kt', kotlinSource)
    const kotlinGlue = renderKotlinSourceGlue('K_atlas', kotlin).source
    expect(kotlinGlue).toContain('private fun readPoint(value: Any, path: String): app.atlas.Point {')
    expect(kotlinGlue).toContain('private fun encodePoint(value: app.atlas.Point): JSONObject {')
    expect(kotlinGlue).toContain('private fun readDate(value: Any, path: String): java.util.Date {')
    expect(kotlinGlue).toContain('readPoint(args.get(0), "args[0]")')
    expect(kotlinGlue).toContain('JSONArray().put(dateToString(result))')
  })

  it('typechecks date, data, struct and enum calls', () => {
    const swift = nativeSourceContract('/app/native/Atlas.swift', swiftSource)
    const temp = mkdtempSync(join(tmpdir(), 'one-native-source-payloads-'))
    writeFileSync(join(temp, 'Atlas.d.swift.ts'), swift.declaration)
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
    writeFileSync(join(temp, 'call.ts'), `import { Atlas, type Point } from './Atlas.swift'
const point: Point = { x: 1, y: 2 }
const a: Promise<Date> = Atlas.at(new Date())
const b: Promise<Uint8Array> = Atlas.blob(new Uint8Array([1]))
const c: Promise<Point> = Atlas.pin(point)
void [a, b, c]
Atlas.at('yesterday')
`)
    // one compilation must accept the valid calls and reject only the string date.
    const badCall = spawnSync(process.execPath, [tsc, '-p', temp], { encoding: 'utf8' })
    expect(badCall.status).toBe(1)
    expect(badCall.stdout.match(/error TS\d+:/g)).toEqual(['error TS2345:'])
  })
})
