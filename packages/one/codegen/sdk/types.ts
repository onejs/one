// parses a swift type from symbol graph declaration fragments. identifiers keep
// the precise identifier apple attaches, so a name resolves to its declaration
// in whichever module declares it.
import type { Fragment } from './graph'

export type SwiftType =
  // args holds every segment's arguments in order, the order a nested declaration lists its
  // owner's parameters before its own; segments counts each dotted segment's share when an
  // enclosing segment carries any, as in Owner<String>.Handler<Int>
  | { k: 'named'; name: string; usr?: string; args: SwiftType[]; segments?: number[] }
  | { k: 'optional'; t: SwiftType; implicit: boolean }
  | { k: 'array'; t: SwiftType }
  | { k: 'dictionary'; key: SwiftType; value: SwiftType }
  | { k: 'tuple'; items: { label?: string; t: SwiftType }[] }
  | {
      k: 'function'
      params: { label?: string; t: SwiftType }[]
      result: SwiftType
      async: boolean
      throws: boolean
      escaping: boolean
      sendable: boolean
    }
  | { k: 'existential'; some: boolean; t: SwiftType }
  | { k: 'composition'; items: SwiftType[] }
  | { k: 'variadic'; t: SwiftType }
  | { k: 'inout'; t: SwiftType }
  | { k: 'metatype'; t: SwiftType }

type Token =
  | { k: 'id'; text: string; usr?: string }
  | { k: 'kw'; text: string }
  | { k: 'attr'; text: string }
  | { k: 'p'; text: string }

const PUNCTUATION = ['...', '->', '?', '!', '[', ']', ':', ',', '<', '>', '(', ')', '.', '&', '=']

function tokenize(fragments: Fragment[]): Token[] {
  const out: Token[] = []
  for (const fragment of fragments) {
    if (fragment.kind === 'typeIdentifier') {
      out.push({ k: 'id', text: fragment.spelling, usr: fragment.preciseIdentifier })
      continue
    }
    if (fragment.kind === 'attribute') {
      out.push({ k: 'attr', text: fragment.spelling })
      continue
    }
    if (fragment.kind === 'keyword') {
      out.push({ k: 'kw', text: fragment.spelling.trim() })
      continue
    }
    let text = fragment.spelling
    while (text.length) {
      const space = /^\s+/.exec(text)
      if (space) {
        text = text.slice(space[0].length)
        continue
      }
      const attr = /^@\w+(\([^)]*\))?/.exec(text)
      if (attr) {
        out.push({ k: 'attr', text: attr[0] })
        text = text.slice(attr[0].length)
        continue
      }
      const punct = PUNCTUATION.find((p) => text.startsWith(p))
      if (punct) {
        out.push({ k: 'p', text: punct })
        text = text.slice(punct.length)
        continue
      }
      const word = /^[A-Za-z_][A-Za-z0-9_]*/.exec(text)
      if (word) {
        const keyword = ['any', 'some', 'inout', 'async', 'throws', 'rethrows', 'Type', 'Protocol', 'borrowing', 'consuming', 'sending', 'isolated', 'each', 'repeat'].includes(word[0])
        out.push(keyword ? { k: 'kw', text: word[0] } : { k: 'id', text: word[0] })
        text = text.slice(word[0].length)
        continue
      }
      // a literal (a default value) or a character the grammar does not use
      out.push({ k: 'p', text: text[0] })
      text = text.slice(1)
    }
  }
  return out
}

export class TypeParseError extends Error {}

class Parser {
  i = 0
  constructor(readonly tokens: Token[]) {}
  peek(offset = 0) {
    return this.tokens[this.i + offset]
  }
  is(k: Token['k'], text?: string, offset = 0) {
    const token = this.peek(offset)
    return !!token && token.k === k && (text === undefined || token.text === text)
  }
  take(k: Token['k'], text?: string) {
    if (!this.is(k, text)) throw new TypeParseError(`expected ${text ?? k} at ${this.describe()}`)
    return this.tokens[this.i++]
  }
  describe() {
    return this.tokens.slice(this.i, this.i + 6).map((t) => t.text).join(' ')
  }
  type(): SwiftType {
    const attrs: string[] = []
    for (;;) {
      if (this.is('attr')) attrs.push(this.take('attr').text)
      // an attribute naming a type (`@MainActor`) arrives as `@` and an identifier
      else if (this.is('p', '@') && this.is('id', undefined, 1)) {
        this.i++
        attrs.push(`@${this.take('id').text}`)
      } else break
    }
    for (const modifier of ['borrowing', 'consuming', 'sending', 'isolated']) {
      if (this.is('kw', modifier)) this.i++
    }
    if (this.is('kw', 'inout')) {
      this.i++
      return { k: 'inout', t: this.type() }
    }
    if (this.is('kw', 'any') || this.is('kw', 'some')) {
      const some = this.take('kw').text === 'some'
      return this.suffixes({ k: 'existential', some, t: this.composed() }, attrs)
    }
    return this.suffixes(this.composed(attrs), attrs)
  }
  composed(attrs: string[] = []): SwiftType {
    const first = this.primary(attrs)
    if (!this.is('p', '&')) return first
    const items = [first]
    while (this.is('p', '&')) {
      this.i++
      items.push(this.primary([]))
    }
    return { k: 'composition', items }
  }
  suffixes(base: SwiftType, attrs: string[]): SwiftType {
    let t = base
    for (;;) {
      if (this.is('p', '?') || this.is('p', '!')) {
        t = { k: 'optional', t, implicit: this.take('p').text === '!' }
      } else if (this.is('p', '...')) {
        this.i++
        t = { k: 'variadic', t }
      } else if (this.is('p', '.') && (this.is('kw', 'Type', 1) || this.is('kw', 'Protocol', 1))) {
        this.i += 2
        t = { k: 'metatype', t }
      } else break
    }
    void attrs
    return t
  }
  primary(attrs: string[]): SwiftType {
    if (this.is('p', '[')) {
      this.i++
      const key = this.type()
      if (this.is('p', ':')) {
        this.i++
        const value = this.type()
        this.take('p', ']')
        return { k: 'dictionary', key, value }
      }
      this.take('p', ']')
      return { k: 'array', t: key }
    }
    if (this.is('p', '(')) return this.parenthesized(attrs)
    if (this.is('id')) return this.named()
    // an integer generic argument, as in `InlineArray<4, Float>`
    if (this.is('p') && /^[0-9]$/.test(this.peek().text)) {
      let digits = ''
      while (this.is('p') && /^[0-9]$/.test(this.peek().text)) digits += this.take('p').text
      return { k: 'named', name: digits, args: [] }
    }
    // swift spells `Any` and `Self` as keywords
    if (this.is('kw', 'Any') || this.is('kw', 'Self') || this.is('kw', 'AnyObject')) return this.named()
    if (this.is('kw', 'each') || this.is('kw', 'repeat')) {
      // a parameter pack names its generic after the keyword
      const keyword = this.take('kw').text
      const pack = this.type()
      return { k: 'named', name: `${keyword} ${typeText(pack)}`, args: [] }
    }
    if (this.is('kw', 'Type') || this.is('kw', 'Protocol')) {
      // `Self.Type` style forms read as a named type
      return { k: 'named', name: this.take('kw').text, args: [] }
    }
    throw new TypeParseError(`unexpected ${this.describe()}`)
  }
  named(): SwiftType {
    const parts: string[] = []
    let usr: string | undefined
    const args: SwiftType[] = []
    const segments: number[] = []
    for (;;) {
      const token = (this.is('kw') ? this.take('kw') : this.take('id')) as { text: string; usr?: string }
      parts.push(token.text)
      usr = token.usr ?? usr
      const start = args.length
      if (this.is('p', '<')) {
        this.i++
        args.push(this.type())
        while (this.is('p', ',')) {
          this.i++
          args.push(this.type())
        }
        this.take('p', '>')
      }
      segments.push(args.length - start)
      if (this.is('p', '.') && this.is('id', undefined, 1)) {
        this.i++
        continue
      }
      break
    }
    const nested = segments.slice(0, -1).some(Boolean)
    return { k: 'named', name: parts.join('.'), usr, args, ...(nested && { segments }) }
  }
  parenthesized(attrs: string[]): SwiftType {
    this.take('p', '(')
    const items: { label?: string; t: SwiftType }[] = []
    while (!this.is('p', ')')) {
      let label: string | undefined
      // `label: Type`, `_ name: Type` or `label name: Type`
      if (this.is('id') && this.is('p', ':', 1)) {
        label = this.take('id').text
        this.take('p', ':')
      } else if (this.is('id') && this.is('id', undefined, 1) && this.is('p', ':', 2)) {
        label = this.take('id').text
        this.i++
        this.take('p', ':')
      }
      items.push({ label, t: this.type() })
      if (this.is('p', ',')) this.i++
      else if (!this.is('p', ')')) throw new TypeParseError(`expected , or ) at ${this.describe()}`)
    }
    this.take('p', ')')
    let isAsync = false
    let isThrows = false
    if (this.is('kw', 'async')) {
      this.i++
      isAsync = true
    }
    if (this.is('kw', 'throws') || this.is('kw', 'rethrows')) {
      this.i++
      isThrows = true
      if (this.is('p', '(')) {
        // typed throws: throws(SomeError)
        this.take('p', '(')
        this.type()
        this.take('p', ')')
      }
    }
    if (this.is('p', '->')) {
      this.i++
      const result = this.type()
      return {
        k: 'function',
        params: items,
        result,
        async: isAsync,
        throws: isThrows,
        escaping: attrs.some((a) => a === '@escaping'),
        sendable: attrs.some((a) => a === '@Sendable'),
      }
    }
    if (items.length === 1 && items[0].label === undefined) return items[0].t
    return { k: 'tuple', items }
  }
}

export function parseType(fragments: Fragment[]): SwiftType {
  const parser = new Parser(tokenize(fragments))
  const type = parser.type()
  if (parser.i !== parser.tokens.length) throw new TypeParseError(`trailing ${parser.describe()}`)
  return type
}

// a parameter's fragments read `internalName: Type`; drop the name and colon.
export function parameterType(fragments: Fragment[]): SwiftType {
  const colon = fragments.findIndex((f) => f.kind === 'text' && f.spelling.includes(':'))
  if (colon < 0) return parseType(fragments)
  const rest = fragments.slice(colon)
  const head = rest[0]
  const after = head.spelling.slice(head.spelling.indexOf(':') + 1)
  // a default value follows ` = `; it is not part of the type
  const body = [...(after.trim() ? [{ ...head, spelling: after }] : []), ...rest.slice(1)]
  const equals = body.findIndex((f) => f.kind === 'text' && /(^|\s)=\s/.test(f.spelling))
  return parseType(equals < 0 ? body : [
    ...body.slice(0, equals),
    { ...body[equals], spelling: body[equals].spelling.split(/\s=\s/)[0] },
  ])
}

// each parameter's default value, read from the whole declaration because a
// symbol graph spells defaults only there. a call may leave a defaulted
// parameter out.
export function parameterDefaults(declaration: Fragment[]): (string | undefined)[] {
  const keyword = declaration.findIndex((f) => f.kind === 'keyword' && ['init', 'func', 'subscript', 'macro'].includes(f.spelling))
  // a function's name may be an operator spelled with brackets
  const named = ['func', 'macro'].includes(declaration[keyword]?.spelling)
  const name = named ? declaration.findIndex((f, i) => i > keyword && f.kind === 'identifier') : keyword
  const source = declaration.slice(name + 1).map((f) => f.spelling).join('')
  const defaults: (string | undefined)[] = []
  let depth = 0
  let quoted = false
  let start = -1
  let equals = -1
  for (let i = 0; i < source.length; i++) {
    const c = source[i]
    if (quoted) {
      if (c === '\\') i++
      else if (c === '"') quoted = false
      continue
    }
    if (c === '"') quoted = true
    else if (c === '-' && source[i + 1] === '>') i++
    else if ('([{<'.includes(c)) {
      depth++
      if (c === '(' && depth === 1 && start < 0) start = i + 1
    } else if (')]}>'.includes(c) || c === ',' && depth === 1) {
      if (depth === 1 && start >= 0) {
        if (source.slice(start, i).trim()) defaults.push(equals < 0 ? undefined : source.slice(equals + 1, i).trim())
        equals = -1
        if (c === ')') return defaults
        start = i + 1
      }
      if (c !== ',') depth--
    } else if (c === '=' && depth === 1 && source[i - 1] === ' ' && source[i + 1] === ' ') equals = i
  }
  return defaults
}

// a named type as swift spells it, each segment with its own arguments
export function namedText(type: Extract<SwiftType, { k: 'named' }>, text: (t: SwiftType) => string) {
  const list = (args: SwiftType[]) => (args.length ? `<${args.map(text).join(', ')}>` : '')
  if (!type.segments) return type.name + list(type.args)
  let at = 0
  return type.name
    .split('.')
    .map((part, i) => part + list(type.args.slice(at, (at += type.segments![i]))))
    .join('.')
}

export function typeText(type: SwiftType): string {
  switch (type.k) {
    case 'named':
      return namedText(type, typeText)
    case 'optional':
      return `${typeText(type.t)}?`
    case 'array':
      return `[${typeText(type.t)}]`
    case 'dictionary':
      return `[${typeText(type.key)}: ${typeText(type.value)}]`
    case 'tuple':
      return `(${type.items.map((i) => (i.label ? `${i.label}: ` : '') + typeText(i.t)).join(', ')})`
    case 'function':
      return `(${type.params.map((p) => typeText(p.t)).join(', ')})${type.async ? ' async' : ''}${type.throws ? ' throws' : ''} -> ${typeText(type.result)}`
    case 'existential':
      return `${type.some ? 'some' : 'any'} ${typeText(type.t)}`
    case 'composition':
      return type.items.map(typeText).join(' & ')
    case 'variadic':
      return `${typeText(type.t)}...`
    case 'inout':
      return `inout ${typeText(type.t)}`
    case 'metatype':
      return `${typeText(type.t)}.Type`
  }
}
