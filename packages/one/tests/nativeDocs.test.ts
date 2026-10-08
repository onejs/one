import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { One } from '../src/one'

// every PropsTable with a `source` in the native docs must list exactly the members
// that type declares, with the declared types, so the reference cannot drift from source.
const docs = join(__dirname, '../../../apps/onestack.dev/data/native')
const platform = join(__dirname, '../src/platform')
const indexes = join(docs, '../docs')
const referenceDocs = [
  ...readdirSync(docs)
    .filter((name) => name.endsWith('.mdx'))
    .map((name) => ({ name, file: join(docs, name) })),
  ...readdirSync(indexes)
    .filter((name) => name.startsWith('native-') && name.endsWith('.mdx'))
    .map((name) => ({ name, file: join(indexes, name) })),
]

// the text between a brace at `start` and its matching close.
function block(text: string, start: number) {
  let depth = 0
  for (let index = start; index < text.length; index++) {
    if (text[index] === '{') depth++
    if (text[index] === '}' && --depth === 0) return text.slice(start + 1, index)
  }
  throw new Error(`unbalanced braces at ${text.slice(start, start + 40)}`)
}

// generated types reach swiftui names through `import type * as Styles`; docs name them
// bare. a union's optional leading bar is dropped.
const normalize = (type: string) =>
  type
    .replace(/'/g, '"')
    .replace(/\bStyles\./g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\| /, '')

// top level members of an object type body: `name?: type` and `name(args): result`.
function members(body: string) {
  const result = new Map<string, string>()
  let depth = 0
  let current = ''
  const flush = () => {
    const member = current.trim()
    current = ''
    if (!member || member.startsWith('//')) return
    const method = member.match(/^(\w+)\(([^)]*)\)\s*:\s*([\s\S]+)$/)
    if (method) {
      result.set(method[1], normalize(`(${method[2]}) => ${method[3]}`))
      return
    }
    const property = member.match(/^(?:readonly\s+)?(\w+)\??\s*:\s*([\s\S]+)$/)
    if (!property) throw new Error(`unparsed member: ${member}`)
    result.set(property[1], normalize(property[2]))
  }
  // a union written one branch per line continues its member.
  for (const line of body.replace(/\n\s*\|/g, ' |').split('\n')) {
    const code = line.replace(/\/\/.*$/, '')
    for (const char of code) {
      if ('{<(['.includes(char)) depth++
      if ('}>)]'.includes(char) && !(char === '>' && current.endsWith('='))) depth--
      if (depth === 0 && (char === ';' || char === ',')) flush()
      else current += char
    }
    if (depth === 0) flush()
    else current += '\n'
  }
  return result
}

// members of a type alias or interface, merging the object literals and same-file
// aliases it joins with & or |. members typed never only exclude a union branch.
function resolve(text: string, name: string): Map<string, string> | undefined {
  const match = text.match(
    new RegExp(`(?:type ${name}\\b[^=]*=|interface ${name}\\b[^{]*)`)
  )
  if (!match) return
  const start = match.index! + match[0].length
  if (match[0].startsWith('interface'))
    return members(block(text, text.indexOf('{', start)))
  const result = new Map<string, string>()
  const merge = (from: Map<string, string>) => {
    for (const [key, type] of from) if (type !== 'never') result.set(key, type)
  }
  let depth = 0
  let wrappers = 0
  for (let index = start; index < text.length; index++) {
    const char = text[index]
    if (char === '\n' && depth === 0 && /^[^\s|&]/.test(text[index + 1] ?? '')) break
    if (char === '{' && depth === 0) {
      const body = block(text, index)
      merge(members(body))
      index += body.length + 1
    } else if (char === '>' && depth === 0 && wrappers) wrappers--
    else if ('{<(['.includes(char)) depth++
    else if ('}>)]'.includes(char) && text[index - 1] !== '=') depth--
    else if (depth === 0 && /[A-Za-z_]/.test(char) && !/\w/.test(text[index - 1])) {
      const id = text.slice(index).match(/^\w+/)![0]
      // Readonly<{ ... }> reads as its object.
      if (id === 'Readonly' && text[index + id.length] === '<') {
        wrappers++
        index += id.length
        continue
      }
      const inner = id === name ? undefined : resolve(text, id)
      if (inner) merge(inner)
      index += id.length - 1
    }
  }
  return result
}

// members of a declared type, as `file#Type.member.member` with the file relative to
// src/platform.
function declared(source: string) {
  const [file, reference] = source.split('#')
  const [name, ...path] = reference.split('.')
  const text = readFileSync(join(platform, file), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  let result = resolve(text, name)
  if (!result) throw new Error(`${file} declares no ${name}`)
  for (const key of path) {
    const type = result.get(key)
    if (!type) throw new Error(`${source}: no member ${key}`)
    result = members(block(type, type.indexOf('{')))
  }
  return result
}

type Row = { name: string; type: string }
const tables = readdirSync(docs)
  .filter((name) => name.endsWith('.mdx'))
  .flatMap((name) =>
    [
      ...readFileSync(join(docs, name), 'utf8').matchAll(/<PropsTable([\s\S]*?)\/>/g),
    ].flatMap(([, attributes]) => {
      const source = attributes.match(/source="([^"]+)"/)?.[1]
      if (!source) return []
      const data = attributes.match(/data=\{(\[[\s\S]*\])\}/)![1]
      return [{ doc: name, source, rows: new Function(`return ${data}`)() as Row[] }]
    })
  )

describe('native docs reference', () => {
  it('finds sourced tables', () => {
    expect(tables.length).toBeGreaterThan(0)
    // service references resolve against the public object, including namespace ownership.
    for (const { name, file } of referenceDocs) {
      const text = readFileSync(file, 'utf8')
      for (const [, namespace, member] of text.matchAll(
        /\bOne\.([A-Za-z]+)(?:\.([A-Za-z]+))?/g
      )) {
        const service = Reflect.get(One, namespace)
        expect(service, `${name}: One.${namespace}`).toBeDefined()
        if (member) {
          expect(
            Reflect.get(service, member),
            `${name}: One.${namespace}.${member}`
          ).toBeDefined()
        }
      }
    }
  })
  const bySource = Map.groupBy(tables, (table) => `${table.doc} ${table.source}`)
  for (const [key, group] of bySource) {
    it(`${key} matches its declaration`, () => {
      const expected = declared(group[0].source)
      const documented = new Map(
        group.flatMap((table) => table.rows.map((row) => [row.name, normalize(row.type)]))
      )
      expect(Object.fromEntries(documented)).toEqual(Object.fromEntries(expected))
    })
  }
})
