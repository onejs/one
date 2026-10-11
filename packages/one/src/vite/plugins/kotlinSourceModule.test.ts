import { createHash } from 'node:crypto'
import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { renderKotlinSourceModule } from './kotlinSourceModule'

const roots: string[] = []

function kotlinFixture(expo = false) {
  const root = mkdtempSync(join(tmpdir(), 'one-metro-kotlin-'))
  roots.push(root)
  symlinkSync(resolve(__dirname, '../../../../../node_modules'), join(root, 'node_modules'))
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: expo ? { expo: '*' } : {} }))
  const source = join(root, 'Device.kt')
  writeFileSync(
    source,
    'object Device : OneModule {\n  fun info(): String { return "kotlin" }\n}\n'
  )
  return { root, source }
}

function kotlinSourceId(root: string, source: string) {
  const relativePath = source.slice(root.length + 1).replaceAll('\\', '/')
  return `K_${createHash('sha256').update(relativePath).digest('hex').slice(0, 16)}`
}

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

describe('kotlin source native module', () => {
  it('renders the module host for android', () => {
    const fixture = kotlinFixture()
    const module = renderKotlinSourceModule(fixture.source, 'android', fixture.root)
    expect(module.code).toContain('Device')
    expect(module.code).toContain('callNativeSource')
    expect(module.watchFiles).toEqual([fixture.source])
  })

  it('wraps wired methods with encode and revive, keeping plain methods untouched', () => {
    const fixture = kotlinFixture()
    const plain = renderKotlinSourceModule(fixture.source, 'android', fixture.root)
    expect(plain.code).not.toContain('encodeNativeSourceArgs')
    const atlas = join(fixture.root, 'Atlas.kt')
    writeFileSync(
      atlas,
      'object Atlas : OneModule {\n  fun at(when: Date): Date = when\n}\n'
    )
    const module = renderKotlinSourceModule(atlas, 'android', fixture.root)
    expect(module.code).toContain('encodeNativeSourceArgs')
    expect(module.code).toContain('decodeNativeSourceResult')
    expect(module.code).toContain('wire.native.js')
  })

  it('renders subscriptions as event listeners', () => {
    const fixture = kotlinFixture()
    const clock = join(fixture.root, 'Clock.kt')
    writeFileSync(
      clock,
      'object Clock : OneModule {\n  fun onTick(callback: (Double) -> Unit) {}\n}\n'
    )
    const module = renderKotlinSourceModule(clock, 'android', fixture.root)
    expect(module.code).toContain('events.native.js')
    expect(module.code).toContain('subscribeNativeSourceEvent(')
  })

  it('rejects iOS, source without a module, and Expo prebuild without generated glue', () => {
    const fixture = kotlinFixture()
    expect(() => renderKotlinSourceModule(fixture.source, 'ios', fixture.root)).toThrow(
      'Kotlin source'
    )
    const empty = join(fixture.root, 'Empty.kt')
    writeFileSync(empty, 'val unused = 1\n')
    expect(() => renderKotlinSourceModule(empty, 'android', fixture.root)).toThrow(
      'has no OneModule object'
    )
    const expo = kotlinFixture(true)
    expect(() => renderKotlinSourceModule(expo.source, 'android', expo.root)).toThrow(
      'nativeSource'
    )
  })

  it('bundles Kotlin in Expo prebuild apps once the plugin copied the sources', () => {
    const expo = kotlinFixture(true)
    const id = kotlinSourceId(expo.root, expo.source)
    mkdirSync(join(expo.root, 'android', 'app', 'src', 'main', 'java', 'one', 'source', id), {
      recursive: true,
    })
    const module = renderKotlinSourceModule(expo.source, 'android', expo.root)
    expect(module.code).toContain('Device')
    expect(module.code).toContain(`"${id}.Device"`)
  })
})
