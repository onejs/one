import type { OneSDK, OneSDKHandle, OneSDKResult } from '../specs/OneSDK.nitro'

export type { OneSDKHandle } from '../specs/OneSDK.nitro'
export type SDKNative = Pick<OneSDK, 'call' | 'callSync' | 'callAsync' | 'callFunction'>
export type Implements<P> = Partial<P>
export type NativeOut<T> = { value: T }
export type NativeError = SDKHandle & { readonly message?: string }
export type NativeMap<K, V> = Map<K, V>
export type Handle<_Name = string, _Args = unknown> = SDKHandle

const nativeHandle = Symbol('one.sdk.handle')
export class SDKHandle {
  constructor(readonly $handle: OneSDKHandle) {}
}

type Wrapper = new (handle: OneSDKHandle) => SDKHandle
const classes = new Map<string, Wrapper>()
const wrappers = new WeakMap<OneSDKHandle, SDKHandle>()
const protocols = new Map<string, Record<string, string>>()
let nativeSource: SDKNative | (() => SDKNative) | undefined

export function setSDKNative(native: SDKNative | (() => SDKNative)) {
  nativeSource = native
}

function native(): SDKNative {
  if (!nativeSource) throw new Error('iOS SDK bindings need a native iOS build')
  if (typeof nativeSource === 'function') nativeSource = nativeSource()
  return nativeSource
}

export function registerSDKClass(swiftName: string, wrapper: Wrapper) {
  classes.set(swiftName, wrapper)
}

export function registerSDKProtocol(usr: string, methods: Record<string, string>) {
  protocols.set(usr, methods)
}

export type WireHint = {
  protocol?: string
  array?: WireHint
  dictionary?: WireHint
  fields?: Record<string, WireHint>
  callback?: { out: number[] }
}
type Callback = { fn: (...args: any[]) => unknown; out: number[] }
type Context = { handles: OneSDKHandle[]; callbacks: Callback[] }
const context = (): Context => ({ handles: [], callbacks: [] })
type Wire = null | boolean | number | string | Wire[] | { [key: string]: Wire }
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function base64(bytes: Uint8Array): string {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0)
    out +=
      alphabet[n >>> 18] +
      alphabet[(n >>> 12) & 63] +
      (i + 1 < bytes.length ? alphabet[(n >>> 6) & 63] : '=') +
      (i + 2 < bytes.length ? alphabet[n & 63] : '=')
  }
  return out
}

function unbase64(text: string): ArrayBuffer {
  if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(text)) {
    throw new TypeError('invalid SDK base64 data')
  }
  const bytes = new Uint8Array(
    (text.length / 4) * 3 - (text.endsWith('==') ? 2 : text.endsWith('=') ? 1 : 0)
  )
  let at = 0
  for (let i = 0; i < text.length; i += 4) {
    const n =
      (alphabet.indexOf(text[i]) << 18) |
      (alphabet.indexOf(text[i + 1]) << 12) |
      (Math.max(0, alphabet.indexOf(text[i + 2])) << 6) |
      Math.max(0, alphabet.indexOf(text[i + 3]))
    bytes[at++] = n >>> 16
    if (at < bytes.length) bytes[at++] = n >>> 8
    if (at < bytes.length) bytes[at++] = n
  }
  return bytes.buffer
}

function handleOf(value: unknown): OneSDKHandle | undefined {
  if (value instanceof SDKHandle) return value.$handle
  if (typeof value === 'function')
    return (value as unknown as { [nativeHandle]?: OneSDKHandle })[nativeHandle]
  return undefined
}

function encode(value: unknown, ctx: Context, hint?: WireHint): Wire {
  if (value == null) return null
  const handle = handleOf(value)
  if (handle) {
    let index = ctx.handles.indexOf(handle)
    if (index < 0) index = ctx.handles.push(handle) - 1
    return { $h: index }
  }
  if (value instanceof Date) return { $date: value.getTime() }
  if (value instanceof ArrayBuffer) return { $data: base64(new Uint8Array(value)) }
  if (ArrayBuffer.isView(value))
    return {
      $data: base64(new Uint8Array(value.buffer, value.byteOffset, value.byteLength)),
    }
  if (typeof value === 'function') {
    return {
      $f:
        ctx.callbacks.push({
          fn: value as Callback['fn'],
          out: hint?.callback?.out ?? [],
        }) - 1,
    }
  }
  if (Array.isArray(value)) return value.map((v) => encode(v, ctx, hint?.array))
  if (value instanceof Map) {
    const entries: Record<string, Wire> = {}
    for (const [key, item] of value) {
      if (typeof key !== 'string' && typeof key !== 'number')
        throw new TypeError('SDK dictionary keys must have a string or number wire form')
      entries[String(key)] = encode(item, ctx, hint?.dictionary)
    }
    return entries
  }
  if (typeof value === 'object') {
    if (hint?.protocol) {
      const titles = protocols.get(hint.protocol)
      if (!titles) throw new TypeError(`unregistered SDK protocol ${hint.protocol}`)
      const methods: Record<string, Wire> = {}
      for (const [name, fn] of Object.entries(value)) {
        if (fn === undefined) continue
        if (!Object.hasOwn(titles, name) || typeof fn !== 'function')
          throw new TypeError(`unknown SDK protocol method ${name}`)
        methods[titles[name]] = encode(fn, ctx)
      }
      return { $impl: hint.protocol, methods }
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [
        key,
        encode(v, ctx, hint?.fields?.[key] ?? hint?.dictionary),
      ])
    )
  }
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number' && Number.isFinite(value)) return value
  throw new TypeError(`cannot encode SDK value of type ${typeof value}`)
}

function decode(value: Wire, handles: OneSDKHandle[]): any {
  if (Array.isArray(value)) return value.map((v) => decode(v, handles))
  if (value && typeof value === 'object') {
    if (typeof value.$date === 'number') return new Date(value.$date)
    if (typeof value.$data === 'string') return unbase64(value.$data)
    if (typeof value.$h === 'number') {
      const handle = handles[value.$h]
      if (!handle) throw new TypeError(`missing SDK handle ${value.$h}`)
      if (value.$fn === true) {
        const fn = (...args: unknown[]) => {
          const call = encodeCall(undefined, args)
          return native()
            .callFunction(handle, call.json, call.ctx.handles, call.dispatch)
            .then(decodeSDKResult)
        }
        Object.defineProperty(fn, nativeHandle, { value: handle })
        return fn
      }
      const type = typeof value.$t === 'string' ? value.$t : handle.typeName
      const Wrapper =
        classes.get(type) ?? classes.get(type.replace(/<.*>/g, '')) ?? SDKHandle
      let wrapper = wrappers.get(handle)
      if (!wrapper || !(wrapper instanceof Wrapper)) {
        wrapper = new Wrapper(handle)
        wrappers.set(handle, wrapper)
      }
      return wrapper
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, decode(v, handles)])
    )
  }
  return value
}

export function decodeSDKResult<T = unknown>(result: OneSDKResult): T {
  return decode(JSON.parse(result.json), result.handles) as T
}

function encodeCall(receiver: unknown, args: unknown[], hints: (WireHint | null)[] = []) {
  const ctx = context()
  // omit only trailing undefined values, so swift can evaluate its default arguments.
  let length = args.length
  while (length && args[length - 1] === undefined) length--
  const root: Record<string, Wire> = {
    args: args.slice(0, length).map((v, i) => encode(v, ctx, hints[i] ?? undefined)),
  }
  if (receiver !== undefined) root.self = encode(receiver, ctx)
  const callback = (index: number, json: string, handles: OneSDKHandle[]) => {
    const cb = ctx.callbacks[index]
    if (!cb) throw new TypeError(`missing SDK callback ${index}`)
    const values: unknown[] = decode(JSON.parse(json), handles)
    for (const at of cb.out) values[at] = { value: values[at] }
    return { cb, values }
  }
  const dispatch = (index: number, json: string, handles: OneSDKHandle[]) => {
    const { cb, values } = callback(index, json, handles)
    cb.fn(...values)
  }
  const syncDispatch = (
    index: number,
    json: string,
    handles: OneSDKHandle[]
  ): OneSDKResult => {
    try {
      const { cb, values } = callback(index, json, handles)
      const result = cb.fn(...values)
      if (result instanceof Promise)
        throw new TypeError('a synchronous SDK callback returned a Promise')
      const reply = context()
      const written = values.map((v, i) =>
        cb.out.includes(i) ? (v as NativeOut<unknown>).value : v
      )
      return {
        json: JSON.stringify({
          args: [encode(result, reply), ...written.map((v) => encode(v, reply))],
        }),
        handles: reply.handles,
      }
    } catch (error) {
      return {
        json: JSON.stringify({
          error: error instanceof Error ? error.message : String(error),
        }),
        handles: [],
      }
    }
  }
  return { json: JSON.stringify(root), ctx, dispatch, syncDispatch }
}

export function callSDK<T>(
  module: string,
  id: number,
  receiver: unknown,
  args: unknown[],
  hints?: (WireHint | null)[],
  syncCallbacks = false
): T {
  const call = encodeCall(receiver, args, hints)
  const sdk = native()
  const result = syncCallbacks
    ? sdk.callSync(
        module,
        id,
        call.json,
        call.ctx.handles,
        call.dispatch,
        call.syncDispatch
      )
    : sdk.call(module, id, call.json, call.ctx.handles, call.dispatch)
  return decodeSDKResult<T>(result)
}

export async function callSDKAsync<T>(
  module: string,
  id: number,
  receiver: unknown,
  args: unknown[],
  hints?: (WireHint | null)[]
): Promise<T> {
  const call = encodeCall(receiver, args, hints)
  return decodeSDKResult<T>(
    await native().callAsync(module, id, call.json, call.ctx.handles, call.dispatch)
  )
}
