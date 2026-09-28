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
  writeFileSync(source, 'final class AudioMath: RNXModule { func rms(_ values: [Double]) -> Double { 1 } }\n')
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

    writeFileSync(fixture.sibling, 'final class Helper: RNXModule { func next() -> Int { 2 } }\n')
    const changed = renderSwiftPackageModule(fixture.source, 'ios', fixture.root)
    expect(changed.code).not.toBe(metro.code)
    expect(changed.code).toContain('AudioMath')
  })

  it('rejects Android, Expo prebuild, and Swift outside a package', () => {
    const fixture = swiftFixture()
    expect(() => renderSwiftPackageModule(fixture.source, 'android', fixture.root)).toThrow('Android build')
    const expo = swiftFixture(true)
    expect(() => renderSwiftPackageModule(expo.source, 'ios', expo.root)).toThrow('Expo prebuild')
    const loose = join(fixture.root, 'Loose.swift')
    writeFileSync(loose, 'struct Loose {}\n')
    expect(() => renderSwiftPackageModule(loose, 'ios', fixture.root)).toThrow('no Package.swift')
  })

})
