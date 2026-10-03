import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

// every PropsTable with a `source` in the native docs must list exactly the members
// that type declares, with the declared types, so the reference cannot drift from source.
const docs = join(__dirname, '../../../apps/onestack.dev/data/native')
const platform = join(__dirname, '../src/platform')

// the text between a brace at `start` and its matching close.
function block(text: string, start: number) {
  let depth = 0
  for (let index = start; index < text.length; index++) {
    if (text[index] === '{') depth++
    if (text[index] === '}' && --depth === 0) return text.slice(start + 1, index)
  }
  throw new Error(`unbalanced braces at ${text.slice(start, start + 40)}`)
}

const normalize = (type: string) => type.replace(/'/g, '"').replace(/\s+/g, ' ').trim()

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
  for (const line of body.split('\n')) {
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

// own members of an exported type or interface, as `file#Type.member.member`
// with the file relative to src/platform.
function declared(source: string) {
  const [file, reference] = source.split('#')
  const [name, ...path] = reference.split('.')
  const text = readFileSync(join(platform, file), 'utf8')
  const match = text.match(
    new RegExp(`export (?:type ${name}\\b[^=]*=|interface ${name}\\b[^{]*)`)
  )
  if (!match) throw new Error(`${file} exports no ${name}`)
  let result = members(block(text, text.indexOf('{', match.index! + match[0].length)))
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
