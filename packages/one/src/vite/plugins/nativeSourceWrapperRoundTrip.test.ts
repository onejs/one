import { mkdtempSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { parseSync } from 'oxc-parser'
import { afterAll, describe, expect, it } from 'vitest'
import {
  decodeNativeSourceResult,
  encodeNativeSourceArgs,
} from '../../platform/native-source/wire.native'
import { renderKotlinSourceModule } from './kotlinSourceModule'
import { renderMethodCall, toNativeSourceStructs } from './nativeSourceWires'
import { renderSwiftPackageModule } from './swiftPackageModule'

const roots: string[] = []

afterAll(() => {
  for (const root of roots) rmSync(root, { recursive: true, force: true })
})

function nodeModulesLink(root: string) {
  symlinkSync(resolve(__dirname, '../../../../../node_modules'), join(root, 'node_modules'))
  writeFileSync(join(root, 'package.json'), JSON.stringify({ dependencies: {} }))
}

function swiftPinFixture() {
  const root = mkdtempSync(join(tmpdir(), 'one-struct-swift-'))
  roots.push(root)
  nodeModulesLink(root)
  const packageDir = join(root, 'native-source')
  mkdirSync(packageDir)
  writeFileSync(join(packageDir, 'Package.swift'), 'let package = Package(name: "Atlas")\n')
  const source = join(packageDir, 'Atlas.swift')
  writeFileSync(
    source,
    'struct Waypoint: Codable {\n  var x: Double\n  var y: Double\n  var label: String? = nil\n}\n\n@MainActor final class EscapeHatch: PeachModule {\n  init() {}\n  func pin(_ point: Waypoint) -> Waypoint { point }\n}\n'
  )
  return { root, source }
}

function kotlinPinFixture() {
  const root = mkdtempSync(join(tmpdir(), 'one-struct-kotlin-'))
  roots.push(root)
  nodeModulesLink(root)
  const source = join(root, 'Atlas.kt')
  writeFileSync(
    source,
    'data class Waypoint(val x: Double, val y: Double, val label: String? = null)\n\nobject EscapeHatch : OneModule {\n    fun pin(point: Waypoint): Waypoint = point\n}\n'
  )
  return { root, source }
}

// read the structs table from the complete, valid generated module.
function structsFromCode(code: string) {
  expect(parseSync('native-source.js', code, { sourceType: 'module' }).errors).toEqual([])
  const marker = 'const nativeSourceStructs = '
  const start = code.indexOf(marker)
  if (start < 0) throw new Error('generated module has no nativeSourceStructs')
  let depth = 0
  for (let i = start + marker.length; i < code.length; i++) {
    if (code[i] === '{') depth++
    else if (code[i] === '}') {
      depth--
      if (depth === 0) {
        return JSON.parse(code.slice(start + marker.length, i + 1)) as Parameters<
          typeof encodeNativeSourceArgs
        >[2]
      }
    }
  }
  throw new Error('generated module has unbalanced nativeSourceStructs')
}

const pinMethod = {
  name: 'pin',
  parameters: [{ name: 'point', wire: { kind: 'struct', name: 'Waypoint' } as const }],
  resultWire: { kind: 'struct', name: 'Waypoint' } as const,
}

// executes the exact wrapper expression the generator emits: encode the
// args, cross a json boundary like the native bridge, revive the result.
async function runPin(structs: Parameters<typeof encodeNativeSourceArgs>[2]) {
  const calls: { module: string; method: string; args: unknown[]; hash: string }[] = []
  const callNativeSource = (module: string, method: string, args: unknown[], hash: string) => {
    calls.push({ module, method, args, hash })
    return Promise.resolve(JSON.parse(JSON.stringify(args[0])))
  }
  const snippet = renderMethodCall('atlas.EscapeHatch', pinMethod, 'hash')
  const factory = new Function(
    'callNativeSource',
    'encodeNativeSourceArgs',
    'decodeNativeSourceResult',
    'nativeSourceStructs',
    `return { ${snippet} }`
  ) as (
    call: typeof callNativeSource,
    encode: typeof encodeNativeSourceArgs,
    decode: typeof decodeNativeSourceResult,
    table: Parameters<typeof encodeNativeSourceArgs>[2]
  ) => { pin: (point: unknown) => Promise<unknown> }
  const wrapper = factory(callNativeSource, encodeNativeSourceArgs, decodeNativeSourceResult, structs)
  const result = await wrapper.pin({ x: 1, y: 2 })
  return { calls, result }
}

describe('native source struct normalization', () => {
  it('normalizes the contract array to the name-keyed record the codec walks', () => {
    expect(
      toNativeSourceStructs([
        {
          name: 'Waypoint',
          fields: [
            { name: 'x', optional: false },
            { name: 'y', optional: false },
            { name: 'label', optional: true },
          ],
        },
      ])
    ).toEqual({
      Waypoint: {
        fields: [
          { name: 'x', optional: false },
          { name: 'y', optional: false },
          { name: 'label', optional: true },
        ],
      },
    })
    expect(toNativeSourceStructs([])).toEqual({})
  })

  it('executes a generated swift pin wrapper round trip with one native call', async () => {
    const fixture = swiftPinFixture()
    const module = renderSwiftPackageModule(fixture.source, 'ios', fixture.root)
    expect(module.code).toContain('"Waypoint":{"fields"')
    const structs = structsFromCode(module.code)
    const { calls, result } = await runPin(structs)
    expect(calls).toHaveLength(1)
    expect(calls[0].module).toBe('atlas.EscapeHatch')
    expect(calls[0].method).toBe('pin')
    expect(result).toEqual({ x: 1, y: 2 })
  })

  it('executes a generated kotlin pin wrapper round trip with one native call', async () => {
    const fixture = kotlinPinFixture()
    const module = renderKotlinSourceModule(fixture.source, 'android', fixture.root)
    expect(module.code).toContain('"Waypoint":{"fields"')
    const structs = structsFromCode(module.code)
    const { calls, result } = await runPin(structs)
    expect(calls).toHaveLength(1)
    expect(calls[0].module).toBe('atlas.EscapeHatch')
    expect(calls[0].method).toBe('pin')
    expect(result).toEqual({ x: 1, y: 2 })
  })

  it('rejects the unnormalized array shape with unknown struct Waypoint', () => {
    const wire = { kind: 'struct', name: 'Waypoint' } as const
    expect(() =>
      encodeNativeSourceArgs([{ x: 1, y: 2 }], [wire], [] as unknown as Parameters<typeof encodeNativeSourceArgs>[2])
    ).toThrow('unknown struct Waypoint')
  })
})
