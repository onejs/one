import { styleFields } from '../codegen/catalog'
import { emitControls } from '../codegen/emitControls'
import { emitStyle } from '../codegen/emitStyle'
import { describe, expect, it } from 'vitest'

const generate = (emit: (header: string, outputs: Map<string, string>) => unknown) => {
  const outputs = new Map<string, string>()
  emit('', outputs)
  return (path: string) => {
    const source = outputs.get(path)
    if (source == null) throw new Error(`the generator no longer writes ${path}`)
    return source
  }
}

const styleSource = generate(emitStyle)
const controlSource = generate(emitControls)
// every control serializes the style the same way, so one stands in for all of them.
const swiftSource = () => styleSource('ios/OneNativeStyle.swift')
const nativeSource = () => controlSource('ios/Generated/OneNativeButtonComponentView.mm')
const typeSource = () => controlSource('src/generated/controlTypes.ts')

const matches = (source: string, pattern: RegExp) =>
  [...source.matchAll(pattern)].map((match) => match[1]).sort()

// the body of one generated resolver, so a case in another resolver cannot stand in for it.
const resolver = (source: string, name: string) => {
  const start = source.indexOf(`static func resolve${name}(`)
  if (start < 0) throw new Error(`no generated resolver for ${name}`)
  return source.slice(start, source.indexOf('\n  }\n', start))
}

describe('style fields', () => {
  it('parses every field Swift is sent and serializes every field it reads', () => {
    const fields = styleFields.map((field) => field.name).sort()
    expect(matches(swiftSource(), /dictionary\["(\w+)"\]/g)).toEqual(fields)
    expect(matches(nativeSource(), /style\[@"(\w+)"\]/g)).toEqual(fields)
  })

  it.each([
    ['glassEffect', 'GlassEffect'],
    ['material', 'Material'],
  ])('resolves every %s value it declares, in both languages', (field, alias) => {
    const declared = styleFields.find((candidate) => candidate.name === field)?.values
    expect(declared).toBeDefined()
    // the Swift switch matches on the lowercased wire value, so a caller can write either.
    const resolved = matches(resolver(swiftSource(), alias), /case "(\w+)":/g)
    expect(resolved).toEqual(declared!.map((value) => value.toLowerCase()).sort())
    const exported = typeSource().match(new RegExp(`export type ${alias} = ([^\n]+)`))
    expect(exported).not.toBeNull()
    expect(matches(exported![1], /['"](\w+)['"]/g)).toEqual([...declared!].sort())
  })
})
