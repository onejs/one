import { mkdtempSync, mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { swiftPackagePlugin } from './swiftPackagePlugin'
import { renderSwiftPackageModule } from './swiftPackageModule'

const roots: string[] = []

function swiftFixture(expo = false) {
  const root = mkdtempSync(join(tmpdir(), 'one-metro-swift-'))
  roots.push(root)
  symlinkSync(resolve(__dirname, '../../../../../node_modules'), join(root, 'node_modules'))
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: expo ? { expo: '*' } : {} }))
  const packageDir = join(root, 'native-source')
  mkdirSync(packageDir)
  writeFileSync(join(packageDir, 'Package.swift'), 'let package = Package(name: "Audio")\n')
  const source = join(packageDir, 'Audio.swift')
  const sibling = join(packageDir, 'Helper.swift')
  writeFileSync(source, 'final class AudioMath: PeachModule { func rms(_ values: [Double]) -> Double { 1 } }\n')
  writeFileSync(sibling, 'struct Helper { let value = 1 }\n')
  return { root, packageDir, source, sibling }
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('swift package native module', () => {
  it('renders byte-identical code for the vite loader and metro, with a package-wide hash', async () => {
    const fixture = swiftFixture()
    const watched: string[] = []
    const plugin = swiftPackagePlugin('ios', fixture.root)
    const hook = plugin.load
    if (!hook || typeof hook === 'function') throw new Error('expected vite load hook')
    const viteCode = await Reflect.apply(hook.handler, { addWatchFile: (file: string) => watched.push(file) }, [fixture.source])
    const metro = renderSwiftPackageModule(fixture.source, 'ios', fixture.root)
    expect(viteCode).toBe(metro.code)
    expect(metro.code).toContain('AudioMath')
    expect(metro.code).toContain('callNativeSource')
    expect(watched).toEqual(metro.watchFiles)
    expect(watched).toContain(fixture.sibling)
    expect(readFileSync(join(fixture.packageDir, '.one-native-source.json'), 'utf8')).toContain('AudioMath')

    writeFileSync(fixture.sibling, 'final class Helper: PeachModule { func next() -> Int { 2 } }\n')
    const changed = renderSwiftPackageModule(fixture.source, 'ios', fixture.root)
    expect(changed.code).not.toBe(metro.code)
    expect(changed.code).toContain('AudioMath')
  })

  it('exports a public swift view as a component bound to the package contract', () => {
    const fixture = swiftFixture()
    const level = join(fixture.packageDir, 'Level.swift')
    writeFileSync(level, 'public struct Level: View {\n  let value: Double\n  let onChange: (Double) -> Void\n  public var body: some View { Text("") }\n}\n')
    const module = renderSwiftPackageModule(level, 'ios', fixture.root)
    const descriptor = JSON.parse(readFileSync(join(fixture.packageDir, '.one-native-source.json'), 'utf8'))
    expect(descriptor.views).toEqual({ Level: ['value', 'onChange'] })
    expect(module.code).toContain(`export function Level(props) { return createElement(SwiftPackageView, { packageName: "native_source", view: "Level", contractHash: ${JSON.stringify(descriptor.hash)}, props, fill: false }) }`)
  })

  it('rejects Android and Swift outside a package, and Expo prebuild without generated glue', () => {
    const fixture = swiftFixture()
    expect(() => renderSwiftPackageModule(fixture.source, 'android', fixture.root)).toThrow('Android build')
    const expo = swiftFixture(true)
    expect(() => renderSwiftPackageModule(expo.source, 'ios', expo.root)).toThrow('nativeSource')
    const loose = join(fixture.root, 'Loose.swift')
    writeFileSync(loose, 'struct Loose {}\n')
    expect(() => renderSwiftPackageModule(loose, 'ios', fixture.root)).toThrow('no Package.swift')
  })

  it('bundles Swift in Expo prebuild apps once the plugin generated the pod', () => {
    const expo = swiftFixture(true)
    const podDir = join(expo.root, 'ios', 'OneSwiftPackages', 'native_source')
    mkdirSync(podDir, { recursive: true })
    writeFileSync(join(podDir, 'native_source.podspec'), "Pod::Spec.new do |s|\nend\n")
    const module = renderSwiftPackageModule(expo.source, 'ios', expo.root)
    expect(module.code).toContain('AudioMath')
    expect(module.code).toContain('callNativeSource')
  })

  it('wraps wired methods with encode and revive, keeping plain methods untouched', () => {
    const fixture = swiftFixture()
    const plain = renderSwiftPackageModule(fixture.source, 'ios', fixture.root)
    expect(plain.code).not.toContain('encodeNativeSourceArgs')
    const atlas = join(fixture.root, 'native-source', 'Atlas.swift')
    writeFileSync(
      atlas,
      '@MainActor final class Atlas: PeachModule {\n  init() {}\n  func at(_ when: Date) -> Date { when }\n}\n'
    )
    const module = renderSwiftPackageModule(atlas, 'ios', fixture.root)
    expect(module.code).toContain('encodeNativeSourceArgs')
    expect(module.code).toContain('decodeNativeSourceResult')
    expect(module.code).toContain('const nativeSourceStructs = {}')
    expect(module.code).toContain('wire.native.js')
  })

  it('renders subscriptions as event listeners', () => {
    const fixture = swiftFixture()
    const clock = join(fixture.root, 'native-source', 'Clock.swift')
    writeFileSync(
      clock,
      '@MainActor final class Clock: PeachModule {\n  init() {}\n  func onTick(_ callback: @escaping (Double) -> Void) {}\n}\n'
    )
    const module = renderSwiftPackageModule(clock, 'ios', fixture.root)
    expect(module.code).toContain('events.native.js')
    expect(module.code).toContain('subscribeNativeSourceEvent("native_source.Clock", "onTick"')
    // the clock package has no views: the subscribe glue it writes must
    // still define the args helper the subscribe cases call.
    expect(readFileSync(join(fixture.packageDir, '.one-native-source.swift.txt'), 'utf8')).toContain('private static func args(_ values: [any Encodable]) -> String')
  })

})
