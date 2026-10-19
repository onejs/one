import type { AnyMap } from 'react-native-nitro-modules'
import type {
  OneSDK,
  OneSDKHandle,
  OneSDKPoint,
  OneSDKRect,
  OneSDKResult,
  OneSDKValue,
} from '../specs/OneSDK.nitro'

export type { OneSDKHandle, OneSDKPoint, OneSDKRect, OneSDKResult, OneSDKValue } from '../specs/OneSDK.nitro'
export type SDKNative = Pick<OneSDK, 'call' | 'callSync' | 'callAsync' | 'callFunction' | 'observe' | 'subscribe'>
export type Implements<P> = Partial<P>
export type NativeOut<T> = { value: T }
export type NativeError = SDKHandle & { readonly message?: string }
export type NativeMap<K, V> = Map<K, V>
export type Handle<_Name = string, _Args = unknown> = SDKHandle

const nativeHandle = Symbol('one.sdk.handle')
const unhandled = Symbol('one.sdk.unhandled')

export class SDKHandle {
  // type-only: generated classes list the properties react can observe
  declare readonly $observable: {}
  constructor(readonly $handle: OneSDKHandle, readonly $identity: string | OneSDKHandle = $handle) {}
}
// a handle to an AsyncSequence or Combine publisher delivering T
export type SDKSequence<T> = SDKHandle & { readonly $element: T }

type Wrapper = new (handle: OneSDKHandle, identity?: string) => SDKHandle
const classes = new Map<string, Wrapper>()
const wrappers = new WeakMap<OneSDKHandle, SDKHandle>()
const identifiedWrappers = new Map<string, WeakRef<SDKHandle>>()
const releasedWrappers = new FinalizationRegistry<{ identity: string; reference: WeakRef<SDKHandle> }>(
  ({ identity, reference }) => {
    if (identifiedWrappers.get(identity) === reference) identifiedWrappers.delete(identity)
  }
)
type Method = { id: number; args?: (number | null)[]; hints?: (WireHint | null)[] }
type PropertyTable = { module: string; properties: Record<string, number> }
type ClassTable = PropertyTable & { methods?: Record<string, Method> }
type RegisteredMethod = { module: string; entry: Method; implementation: unknown }
const methodTables = new WeakMap<object, Map<string, RegisteredMethod>>()
const propertyTables = new WeakMap<object, PropertyTable[]>()
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

// another framework's extensions of a class, added to whichever wrapper stands for it
const extensions = new Map<string, Wrapper[]>()

function extend(target: Wrapper, extension: Wrapper) {
  if (target === extension) return
  for (const [from, to, skipped] of [
    [extension.prototype, target.prototype, ['constructor']],
    [extension, target, ['length', 'name', 'prototype']],
  ] as const)
    for (const key of Reflect.ownKeys(from))
      if (!(skipped as readonly PropertyKey[]).includes(key) && !Object.hasOwn(to, key)) {
        Object.defineProperty(to, key, Object.getOwnPropertyDescriptor(from, key)!)
        if (from === extension.prototype && typeof key === 'string') {
          const method = methodTables.get(from)?.get(key)
          if (method) {
            let methods = methodTables.get(to)
            if (!methods) methodTables.set(to, methods = new Map())
            methods.set(key, method)
          }
        }
      }
  const added = propertyTables.get(extension.prototype) ?? []
  propertyTables.set(target.prototype, [...(propertyTables.get(target.prototype) ?? []), ...added])
}

// a framework's own class is the wrapper for its values. an extension from another
// framework adds its members to that class, or stands for it until the framework loads.
export function registerSDKClass(
  swiftName: string,
  wrapper: Wrapper,
  properties?: ClassTable,
  extension = false
) {
  if (properties) {
    propertyTables.set(wrapper.prototype, [{ module: properties.module, properties: properties.properties }])
    const methods = new Map<string, RegisteredMethod>()
    for (const [name, entry] of Object.entries(properties.methods ?? {})) {
      const descriptor = Object.getOwnPropertyDescriptor(wrapper.prototype, name)
      if (typeof descriptor?.value === 'function')
        methods.set(name, { module: properties.module, entry, implementation: descriptor.value })
    }
    methodTables.set(wrapper.prototype, methods)
  }
  const current = classes.get(swiftName)
  if (extension) {
    extensions.set(swiftName, [...(extensions.get(swiftName) ?? []), wrapper])
    if (current) extend(current, wrapper)
    else classes.set(swiftName, wrapper)
    return
  }
  classes.set(swiftName, wrapper)
  for (const added of extensions.get(swiftName) ?? []) extend(wrapper, added)
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
type Context = { handles: OneSDKHandle[]; buffers: ArrayBuffer[]; callbacks: Callback[] }
const context = (): Context => ({ handles: [], buffers: [], callbacks: [] })
type Wire = null | boolean | number | string | Wire[] | { [key: string]: Wire }

function handleOf(value: unknown): OneSDKHandle | undefined {
  if (value instanceof SDKHandle) return value.$handle
  if (typeof value === 'function')
    return (value as unknown as { [nativeHandle]?: OneSDKHandle })[nativeHandle]
  return undefined
}

function toArrayBuffer(view: ArrayBufferView): ArrayBuffer {
  if (view.byteOffset === 0 && view.byteLength === view.buffer.byteLength && view.buffer instanceof ArrayBuffer) {
    return view.buffer
  }
  return view.buffer.slice(view.byteOffset, view.byteOffset + view.byteLength) as ArrayBuffer
}

function toDirectValue(value: unknown): OneSDKValue | typeof unhandled {
  if (value == null) return null
  const t = typeof value
  if (t === 'string' || t === 'number' || t === 'boolean') return value as string | number | boolean
  if (t === 'object') {
    if (value instanceof SDKHandle) return value.$handle
    if (value instanceof ArrayBuffer || value instanceof Date) return value
    if (ArrayBuffer.isView(value)) return toArrayBuffer(value)
    if (
      (value as object).constructor === Object &&
      typeof (value as any).x === 'number' &&
      typeof (value as any).y === 'number'
    ) {
      let count = 0
      for (const _ in value as object) count++
      if (
        count === 4 &&
        typeof (value as any).width === 'number' &&
        typeof (value as any).height === 'number'
      ) {
        return value as OneSDKRect
      }
      if (count === 2) {
        return value as OneSDKPoint
      }
    }
    return unhandled
  }
  if (t === 'function') {
    const h = (value as unknown as { [nativeHandle]?: OneSDKHandle })[nativeHandle]
    if (h) return h
    return unhandled
  }
  throw new TypeError(`cannot encode SDK value of type ${t}`)
}

function addBuffer(buffer: ArrayBuffer, ctx: Context): Wire {
  let index = ctx.buffers.indexOf(buffer)
  if (index < 0) index = ctx.buffers.push(buffer) - 1
  return { $b: index }
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
  if (value instanceof ArrayBuffer) return addBuffer(value, ctx)
  if (ArrayBuffer.isView(value)) return addBuffer(toArrayBuffer(value), ctx)
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
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number') return value
  throw new TypeError(`cannot encode SDK value of type ${typeof value}`)
}

function callFunctionSDK(handle: OneSDKHandle, args: unknown[]): Promise<any> {
  const sdk = native()
  let length = args.length
  while (length && args[length - 1] === undefined) length--
  if (length <= 2) {
    if (length === 0) {
      return (sdk.callFunction as any)(handle).then(decodeSDKResult)
    }
    const a0 = toDirectValue(args[0])
    if (a0 !== unhandled) {
      if (length === 1) {
        return (sdk.callFunction as any)(handle, a0).then(decodeSDKResult)
      }
      const a1 = toDirectValue(args[1])
      if (a1 !== unhandled) {
        return (sdk.callFunction as any)(handle, a0, a1).then(decodeSDKResult)
      }
    }
  }
  const call = encodeCall(undefined, args)
  return (sdk.callFunction as any)(handle, call.envelope, undefined, call.dispatch).then(decodeSDKResult)
}

function wrapHandle(
  handle: OneSDKHandle,
  typeHint?: string,
  identityHint?: string,
  superclassesHint?: string[],
  callableHint?: boolean
): any {
  if (callableHint ?? handle.callable) {
    const fn = (...args: unknown[]) => callFunctionSDK(handle, args)
    Object.defineProperty(fn, nativeHandle, { value: handle })
    return fn
  }
  const identity = identityHint ?? handle.identity
  const existing = identity ? identifiedWrappers.get(identity)?.deref() : wrappers.get(handle)
  if (existing && existing.constructor !== SDKHandle && !typeHint && !superclassesHint) {
    return existing
  }
  const type = typeHint ?? handle.typeName
  let Wrapper = classes.get(type) ?? classes.get(type.replace(/<.*>/g, ''))
  if (!Wrapper) {
    const superclasses = superclassesHint ?? handle.superclasses
    if (superclasses) {
      for (const name of superclasses) {
        Wrapper = classes.get(name) ?? classes.get(name.replace(/<.*>/g, ''))
        if (Wrapper) break
      }
    }
  }
  Wrapper ??= SDKHandle
  if (existing && existing instanceof Wrapper) return existing
  const wrapper = new Wrapper(handle, identity)
  if (identity) {
    const reference = new WeakRef(wrapper)
    identifiedWrappers.set(identity, reference)
    releasedWrappers.register(wrapper, { identity, reference })
  } else wrappers.set(handle, wrapper)
  return wrapper
}

function decode(value: Wire, handles: OneSDKHandle[], buffers?: ArrayBuffer[]): any {
  if (Array.isArray(value)) return value.map((v) => decode(v, handles, buffers))
  if (value && typeof value === 'object') {
    if (typeof value.$date === 'number') return new Date(value.$date)
    if (typeof value.$b === 'number') {
      const buffer = buffers?.[value.$b]
      if (!buffer) throw new TypeError(`missing SDK buffer ${value.$b}`)
      return buffer
    }
    if (typeof value.$h === 'number') {
      const handle = handles[value.$h]
      if (!handle) throw new TypeError(`missing SDK handle ${value.$h}`)
      return wrapHandle(
        handle,
        typeof value.$t === 'string' ? value.$t : undefined,
        typeof value.$id === 'string' ? value.$id : undefined,
        Array.isArray(value.$s) ? (value.$s as string[]) : undefined,
        value.$fn === true ? true : undefined
      )
    }
    return Object.fromEntries(
      Object.entries(value).map(([key, v]) => [key, decode(v, handles, buffers)])
    )
  }
  return value
}

export function decodeSDKResult<T = unknown>(result: OneSDKValue): T {
  if (result === null || typeof result !== 'object') return result as T
  if (result instanceof ArrayBuffer || result instanceof Date) return result as T
  if ('data' in result && Array.isArray((result as OneSDKResult).handles)) {
    const env = result as OneSDKResult
    const failure = env.data.$error
    if (failure && typeof failure === 'object' && !Array.isArray(failure)) {
      throw Object.assign(new Error(String(failure.message)), {
        code: failure.code,
        domain: failure.domain,
        nativeCode: failure.nativeCode,
      })
    }
    return decode(env.data.value as Wire, env.handles, env.buffers) as T
  }
  if (typeof (result as OneSDKHandle).typeName === 'string') {
    return wrapHandle(result as OneSDKHandle) as T
  }
  return result as T
}

function unexpectedCallback(index: number): never {
  throw new TypeError(`missing SDK callback ${index}`)
}

function encodeEnvelope(ctx: Context, data: Record<string, Wire>): OneSDKResult {
  return ctx.buffers.length
    ? { data, handles: ctx.handles, buffers: ctx.buffers }
    : { data, handles: ctx.handles }
}

function callbackError(error: unknown): string {
  try {
    return error instanceof Error ? String(error.message) : String(error)
  } catch {
    return 'JavaScript SDK callback failed'
  }
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
  const envelope = encodeEnvelope(ctx, root)
  if (!ctx.callbacks.length) {
    return { envelope, data: root, ctx, dispatch: undefined, syncDispatch: undefined }
  }
  const callback = (index: number, data: AnyMap, handles: OneSDKHandle[], buffers?: ArrayBuffer[]) => {
    const cb = ctx.callbacks[index]
    if (!cb) throw new TypeError(`missing SDK callback ${index}`)
    const values: unknown[] = decode(data.args as Wire, handles, buffers)
    for (const at of cb.out) values[at] = { value: values[at] }
    return { cb, values }
  }
  const dispatch = (index: number, data: AnyMap, handles: OneSDKHandle[], buffers?: ArrayBuffer[]) => {
    if (data.$reply !== undefined) {
      const respond = decode(data.$reply as Wire, handles, buffers)
      if (typeof respond !== 'function') throw new TypeError('invalid SDK callback reply')
      const fail = (error: unknown) => respond(null, callbackError(error))
      void Promise.resolve()
        .then(() => {
          const { cb, values } = callback(index, data, handles, buffers)
          return cb.fn(...values)
        })
        .then((value) => {
          try { return respond(value) }
          catch (error) { return fail(error) }
        }, fail)
      return
    }
    const { cb, values } = callback(index, data, handles, buffers)
    cb.fn(...values)
  }
  const syncDispatch = (
    index: number,
    data: AnyMap,
    handles: OneSDKHandle[],
    buffers?: ArrayBuffer[]
  ): OneSDKResult => {
    try {
      const { cb, values } = callback(index, data, handles, buffers)
      const result = cb.fn(...values)
      if (result instanceof Promise)
        throw new TypeError('a synchronous SDK callback returned a Promise')
      const reply = context()
      const written = values.map((v, i) =>
        cb.out.includes(i) ? (v as NativeOut<unknown>).value : v
      )
      return encodeEnvelope(reply, {
        args: [encode(result, reply), ...written.map((v) => encode(v, reply))],
      })
    } catch (error) {
      return {
        data: {
          error: callbackError(error),
        },
        handles: [],
      }
    }
  }
  return { envelope, data: root, ctx, dispatch, syncDispatch }
}

export function callSDK<T>(
  module: string,
  id: number,
  receiver: unknown,
  args: unknown[],
  hints?: (WireHint | null)[],
  syncCallbacks = false
): T {
  const sdk = native()
  if (!syncCallbacks && (!hints || !hints.some(Boolean))) {
    let length = args.length
    while (length && args[length - 1] === undefined) length--
    if (length <= 2) {
      const recv = receiver === undefined ? undefined : toDirectValue(receiver)
      if (recv !== unhandled) {
        if (length === 0) {
          return decodeSDKResult<T>((sdk.call as any)(module, id, recv))
        }
        const a0 = toDirectValue(args[0])
        if (a0 !== unhandled) {
          if (length === 1) {
            return decodeSDKResult<T>((sdk.call as any)(module, id, recv, a0))
          }
          const a1 = toDirectValue(args[1])
          if (a1 !== unhandled) {
            return decodeSDKResult<T>((sdk.call as any)(module, id, recv, a0, a1))
          }
        }
      }
    }
  }
  const call = encodeCall(receiver, args, hints)
  const result = syncCallbacks
    ? sdk.callSync(
        module,
        id,
        call.envelope,
        call.dispatch ?? unexpectedCallback,
        call.syncDispatch ?? ((index: number) => ({ data: { error: `missing SDK callback ${index}` }, handles: [] }))
      )
    : (sdk.call as any)(module, id, undefined, call.envelope, undefined, call.dispatch)
  return decodeSDKResult<T>(result)
}

type MethodKey<T> = { [K in keyof T]-?: T[K] extends (...args: any[]) => any ? K : never }[keyof T] & string
type MethodFunction<T, K extends keyof T> = Extract<T[K], (...args: any[]) => any>

// generated metadata preserves overload names, out slots and protocol hints.
// callers opt into background execution without changing ordinary swift signatures.
export async function callSDKMethodAsync<T extends SDKHandle, K extends MethodKey<T>>(
  object: T,
  method: K,
  ...args: Parameters<MethodFunction<T, K>>
): Promise<Awaited<ReturnType<MethodFunction<T, K>>>> {
  if (!Object.hasOwn(object, method)) {
    let prototype = Object.getPrototypeOf(object)
    while (prototype) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, method)
      if (descriptor) {
        const registered = methodTables.get(prototype)?.get(method)
        if (registered && typeof descriptor.value === 'function' && registered.implementation === descriptor.value) {
          const { module, entry } = registered
          const nativeArgs = entry.args ? entry.args.map((at) => at === null ? null : args[at]) : args
          return callSDKAsync<Awaited<ReturnType<MethodFunction<T, K>>>>(module, entry.id, object, nativeArgs, entry.hints)
        }
        break
      }
      prototype = Object.getPrototypeOf(prototype)
    }
  }
  throw new TypeError(`unregistered asynchronous SDK method ${method}`)
}

export async function callSDKAsync<T>(
  module: string,
  id: number,
  receiver: unknown,
  args: unknown[],
  hints?: (WireHint | null)[]
): Promise<T> {
  const sdk = native()
  if (!hints || !hints.some(Boolean)) {
    let length = args.length
    while (length && args[length - 1] === undefined) length--
    if (length <= 2) {
      const recv = receiver === undefined ? undefined : toDirectValue(receiver)
      if (recv !== unhandled) {
        if (length === 0) {
          return decodeSDKResult<T>(await (sdk.callAsync as any)(module, id, recv))
        }
        const a0 = toDirectValue(args[0])
        if (a0 !== unhandled) {
          if (length === 1) {
            return decodeSDKResult<T>(await (sdk.callAsync as any)(module, id, recv, a0))
          }
          const a1 = toDirectValue(args[1])
          if (a1 !== unhandled) {
            return decodeSDKResult<T>(await (sdk.callAsync as any)(module, id, recv, a0, a1))
          }
        }
      }
    }
  }
  const call = encodeCall(receiver, args, hints)
  return decodeSDKResult<T>(
    await (sdk.callAsync as any)(module, id, undefined, call.envelope, undefined, call.dispatch)
  )
}

// the generated native table decides between key-value observing and
// observation tracking for each property
export function observeSDKProperty<T>(
  object: SDKHandle,
  property: string,
  value: (value: T) => void,
  error: (error: Error) => void
): () => void {
  let prototype = Object.getPrototypeOf(object)
  while (prototype) {
    const table = propertyTables.get(prototype)?.find((t) => Object.hasOwn(t.properties, property))
    const id = table?.properties[property]
    if (table && id !== undefined) {
      const call = encodeCall(object, [])
      return native().observe(table.module, id, call.envelope.data, call.ctx.handles, observationDispatch(value, error))
    }
    prototype = Object.getPrototypeOf(prototype)
  }
  throw new TypeError(`unregistered SDK property ${property}`)
}

// native code follows the handle as a Combine publisher or an AsyncSequence
export function subscribeSDK<T>(
  object: SDKHandle,
  value: (value: T) => void,
  error: (error: Error) => void
): () => void {
  return native().subscribe(object.$handle, observationDispatch(value, error))
}

function observationDispatch<T>(value: (value: T) => void, error: (error: Error) => void) {
  return (result: OneSDKResult) => {
    let decoded: T
    try { decoded = decodeSDKResult<T>(result) }
    catch (cause) {
      error(cause instanceof Error ? cause : new Error(String(cause)))
      return
    }
    value(decoded)
  }
}

export { useSDKProperty, useSDKSequence } from './react'
export type { SDKState, SDKObservableKey, SDKElement } from './react'
