// wire walkers for native-source Date, Data and struct payloads. generated
// method wrappers encode arguments before callNativeSource stringifies them
// and revive results after it parses them; view hosts encode props and
// revive callback arguments the same way. the walkers never depend on
// globals, so they run on hermes, jsc and wasm alike.
export interface NativeSourceWireField {
  name: string
  optional: boolean
  wire?: NativeSourceWire
}

export type NativeSourceWire =
  | { kind: 'date' }
  | { kind: 'data' }
  | { kind: 'struct'; name: string }
  | { kind: 'enum'; name: string }
  | { kind: 'array'; element: NativeSourceWire }
  | { kind: 'map'; value: NativeSourceWire }
  | { kind: 'nullable'; inner: NativeSourceWire }

export type NativeSourceStructs = Record<string, { fields: NativeSourceWireField[] }>

// element wires for one imported view, embedded by the bundler: prop wires
// encode props before the host stringifies them, callback wires revive
// callback arguments, and the structs table walks both.
export interface NativeSourceViewWires {
  props: Record<string, NativeSourceWire>
  callbacks: Record<string, (NativeSourceWire | null)[]>
  structs: NativeSourceStructs
}

const BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

export function base64Encode(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const first = bytes[i]
    const second = i + 1 < bytes.length ? bytes[i + 1] : 0
    const third = i + 2 < bytes.length ? bytes[i + 2] : 0
    const triple = (first << 16) | (second << 8) | third
    out += BASE64[(triple >> 18) & 63] + BASE64[(triple >> 12) & 63]
    out += i + 1 < bytes.length ? BASE64[(triple >> 6) & 63] : '='
    out += i + 2 < bytes.length ? BASE64[triple & 63] : '='
  }
  return out
}

export function base64Decode(text: string): Uint8Array {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) {
    throw new TypeError(`expected base64 data`)
  }
  const clean = text.replace(/=+$/, '')
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4))
  let at = 0
  for (let i = 0; i < clean.length; i += 4) {
    const a = BASE64.indexOf(clean[i])
    const b = BASE64.indexOf(clean[i + 1])
    const c = i + 2 < clean.length ? BASE64.indexOf(clean[i + 2]) : 0
    const d = i + 3 < clean.length ? BASE64.indexOf(clean[i + 3]) : 0
    const triple = (a << 18) | (b << 12) | (c << 6) | d
    out[at++] = (triple >> 16) & 255
    if (i + 2 < clean.length) out[at++] = (triple >> 8) & 255
    if (i + 3 < clean.length) out[at++] = triple & 255
  }
  return out.slice(0, at)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function encodeValue(
  value: unknown,
  wire: NativeSourceWire,
  structs: NativeSourceStructs,
  path: string
): unknown {
  switch (wire.kind) {
    case 'date':
      if (!(value instanceof Date)) throw new TypeError(`${path}: expected Date`)
      return value
    case 'data':
      if (!(value instanceof Uint8Array)) throw new TypeError(`${path}: expected Uint8Array`)
      return base64Encode(value)
    case 'enum':
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new TypeError(`${path}: expected an enum value`)
      }
      return value
    case 'struct': {
      if (!isRecord(value)) throw new TypeError(`${path}: expected ${wire.name}`)
      const table = structs[wire.name]
      if (!table) throw new TypeError(`${path}: unknown struct ${wire.name}`)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        if (!table.fields.some((field) => field.name === key)) out[key] = value[key]
      }
      for (const field of table.fields) {
        const present = value[field.name] !== undefined
        if (!present) {
          if (!field.optional) throw new TypeError(`${path}.${field.name}: required`)
          continue
        }
        out[field.name] =
          field.wire === undefined
            ? value[field.name]
            : encodeValue(value[field.name], field.wire, structs, `${path}.${field.name}`)
      }
      return out
    }
    case 'array':
      if (!Array.isArray(value)) throw new TypeError(`${path}: expected an array`)
      return value.map((item, index) => encodeValue(item, wire.element, structs, `${path}[${index}]`))
    case 'map': {
      if (!isRecord(value)) throw new TypeError(`${path}: expected an object`)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        out[key] = encodeValue(value[key], wire.value, structs, `${path}.${key}`)
      }
      return out
    }
    case 'nullable':
      return value === null || value === undefined
        ? null
        : encodeValue(value, wire.inner, structs, path)
  }
}

function decodeValue(
  value: unknown,
  wire: NativeSourceWire,
  structs: NativeSourceStructs,
  path: string
): unknown {
  switch (wire.kind) {
    case 'date': {
      if (typeof value !== 'string') throw new TypeError(`${path}: expected an ISO date string`)
      const date = new Date(value)
      if (Number.isNaN(date.getTime())) throw new TypeError(`${path}: expected an ISO date string`)
      return date
    }
    case 'data': {
      if (typeof value !== 'string') throw new TypeError(`${path}: expected base64 data`)
      try {
        return base64Decode(value)
      } catch {
        throw new TypeError(`${path}: expected base64 data`)
      }
    }
    case 'enum':
      if (typeof value !== 'string' && typeof value !== 'number') {
        throw new TypeError(`${path}: expected an enum value`)
      }
      return value
    case 'struct': {
      if (!isRecord(value)) throw new TypeError(`${path}: expected ${wire.name}`)
      const table = structs[wire.name]
      if (!table) throw new TypeError(`${path}: unknown struct ${wire.name}`)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        if (!table.fields.some((field) => field.name === key)) out[key] = value[key]
      }
      for (const field of table.fields) {
        const present = value[field.name] !== undefined && value[field.name] !== null
        if (!present) {
          if (value[field.name] === null && field.wire?.kind === 'nullable') {
            out[field.name] = null
            continue
          }
          if (!field.optional) throw new TypeError(`${path}.${field.name}: required`)
          continue
        }
        out[field.name] =
          field.wire === undefined
            ? value[field.name]
            : decodeValue(value[field.name], field.wire, structs, `${path}.${field.name}`)
      }
      return out
    }
    case 'array':
      if (!Array.isArray(value)) throw new TypeError(`${path}: expected an array`)
      return value.map((item, index) => decodeValue(item, wire.element, structs, `${path}[${index}]`))
    case 'map': {
      if (!isRecord(value)) throw new TypeError(`${path}: expected an object`)
      const out: Record<string, unknown> = {}
      for (const key of Object.keys(value)) {
        out[key] = decodeValue(value[key], wire.value, structs, `${path}.${key}`)
      }
      return out
    }
    case 'nullable':
      return value === null || value === undefined
        ? null
        : decodeValue(value, wire.inner, structs, path)
  }
}

export function encodeNativeSourceArgs(
  args: unknown[],
  wires: (NativeSourceWire | null | undefined)[],
  structs: NativeSourceStructs
): unknown[] {
  return args.map((arg, index) => {
    const wire = wires[index]
    return wire === undefined || wire === null
      ? arg
      : encodeValue(arg, wire, structs, `args[${index}]`)
  })
}

export function decodeNativeSourceResult(
  value: unknown,
  wire: NativeSourceWire | null | undefined,
  structs: NativeSourceStructs
): unknown {
  return wire === undefined || wire === null ? value : decodeValue(value, wire, structs, 'result')
}

export function encodeNativeSourceProps(
  props: Record<string, unknown>,
  wires: Record<string, NativeSourceWire>,
  structs: NativeSourceStructs
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...props }
  for (const name of Object.keys(wires)) {
    if (out[name] === undefined) continue
    out[name] = encodeValue(out[name], wires[name], structs, `props.${name}`)
  }
  return out
}

export function decodeNativeSourceCallback(
  args: unknown[],
  wires: (NativeSourceWire | null | undefined)[],
  structs: NativeSourceStructs,
  event: string
): unknown[] {
  return args.map((arg, index) => {
    const wire = wires[index]
    return wire === undefined || wire === null
      ? arg
      : decodeValue(arg, wire, structs, `${event}[${index}]`)
  })
}
