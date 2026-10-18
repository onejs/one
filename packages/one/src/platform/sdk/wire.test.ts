import type { AnyMap } from 'react-native-nitro-modules'
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SDKHandle,
  callSDK,
  callSDKAsync,
  decodeSDKResult,
  registerSDKClass,
  registerSDKProtocol,
  observeSDKProperty,
  subscribeSDK,
  setSDKNative,
  type NativeOut,
  type SDKNative,
  type OneSDKHandle,
  type OneSDKResult,
  type OneSDKValue,
} from './wire'

const handle = (
  typeName: string,
  extra: Partial<Omit<OneSDKHandle, 'typeName'>> = {}
): OneSDKHandle => ({ typeName, ...extra }) as OneSDKHandle
const reply = (
  value: AnyMap[string],
  handles: OneSDKHandle[] = [],
  buffers?: ArrayBuffer[]
): OneSDKResult => ({
  data: { value: value ?? null },
  handles,
  ...(buffers ? { buffers } : {}),
})
function fakeEcho(arg0?: OneSDKValue): OneSDKValue {
  if (
    arg0 &&
    typeof arg0 === 'object' &&
    'data' in arg0 &&
    Array.isArray((arg0 as OneSDKResult).handles)
  ) {
    const env = arg0 as OneSDKResult
    const args = env.data.args as AnyMap[string][] | undefined
    return reply(args?.[0] ?? null, env.handles, env.buffers)
  }
  return arg0 ?? null
}
function fake(): SDKNative {
  return {
    call: vi.fn((_module, _id, _receiver, arg0) => fakeEcho(arg0)),
    callAsync: vi.fn(async (_module, _id, _receiver, arg0) => fakeEcho(arg0)),
    observe: vi.fn(),
    subscribe: vi.fn(),
    callSync: vi.fn(),
    callFunction: vi.fn(),
  }
}

afterEach(() => vi.restoreAllMocks())

describe('SDK wire', () => {
  it('round-trips non-finite numbers as Nitro values', () => {
    setSDKNative(fake())
    expect(callSDK('WireTest', 1, undefined, [NaN])).toBeNaN()
    expect(callSDK('WireTest', 1, undefined, [Infinity])).toBe(Infinity)
    expect(callSDK('WireTest', 1, undefined, [-Infinity])).toBe(-Infinity)
    expect(callSDK('WireTest', 1, undefined, [{ values: [NaN, Infinity, -Infinity] }]))
      .toEqual({ values: [NaN, Infinity, -Infinity] })
  })

  it('reuses native reference identity across fresh hybrid handles without merging value handles', () => {
    const first = decodeSDKResult<SDKHandle>(
      handle('Identity.Object', { identity: 'shared-object' })
    )
    const second = decodeSDKResult<SDKHandle>(
      reply({ $h: 0, $id: 'shared-object' }, [handle('Identity.Object')])
    )
    expect(first).toBe(second)
    expect(first.$identity).toBe('shared-object')
    const separate = decodeSDKResult(
      handle('Identity.Object', { identity: 'another-object' })
    )
    expect(separate).not.toBe(first)
  })

  it('round-trips handles, dates, bytes, structs, enums and nested values through native', async () => {
    const native = fake()
    setSDKNative(native)
    const h = handle('WireTest.Value')
    const wrapped = new SDKHandle(h)
    const date = new Date('2026-10-17T10:00:00Z')
    const data = new Uint8Array([0, 1, 127, 128, 255]).buffer
    const rect = { x: 1, y: 2, width: 30, height: 40 }
    expect(callSDK('WireTest', 1, wrapped, [rect, 'label'])).toEqual(rect)
    expect(vi.mocked(native.call).mock.calls[0]).toEqual([
      'WireTest',
      1,
      h,
      rect,
      'label',
    ])
    expect(new Uint8Array(callSDK<ArrayBuffer>('WireTest', 1, undefined, [data]))).toEqual(
      new Uint8Array(data)
    )
    const input = {
      handle: wrapped,
      date,
      data,
      state: 'poweredOn',
      options: ['read', 'write'],
    }
    const result = callSDK<typeof input>('WireTest', 1, wrapped, [input])
    expect(result.handle.$handle).toBe(h)
    expect(result.date).toEqual(date)
    expect(new Uint8Array(result.data)).toEqual(new Uint8Array(data))
    expect(result.state).toBe('poweredOn')
    expect(result.options).toEqual(input.options)
    expect(await callSDKAsync('WireTest', 1, undefined, [date])).toEqual(date)
    const [, , recv, envelope] = vi.mocked(native.call).mock.calls[2]
    expect(recv).toBeUndefined()
    expect((envelope as OneSDKResult).data.self).toEqual({ $h: 0 })
    expect((envelope as OneSDKResult).handles).toEqual([h])
    expect((envelope as OneSDKResult).buffers).toEqual([data])
  })

  it('passes values without invoking JSON serialization in either direction', () => {
    const native = fake()
    setSDKNative(native)
    const parse = vi.spyOn(JSON, 'parse').mockImplementation(() => {
      throw new Error('JSON parse reached')
    })
    const stringify = vi.spyOn(JSON, 'stringify').mockImplementation(() => {
      throw new Error('JSON stringify reached')
    })
    const input = { nil: null, false: false, zero: 0, nested: [null, true, { text: 'hello' }] }
    const value = callSDK('WireTest', 1, undefined, [input])
    parse.mockRestore()
    stringify.mockRestore()
    expect(value).toEqual(input)
  })

  it('preserves key paths, typed-array slices, and dictionary values', () => {
    setSDKNative(fake())
    const bytes = new Uint8Array([9, 1, 2, 8])
    const value = callSDK<{ path: string; bytes: ArrayBuffer; map: object }>(
      'WireTest', 1, undefined,
      [{ path: 'isReady', bytes: bytes.subarray(1, 3), map: new Map([['a', null], ['b', false]]) }]
    )
    expect(value.path).toBe('isReady')
    expect([...new Uint8Array(value.bytes)]).toEqual([1, 2])
    expect(value.map).toEqual({ a: null, b: false })
  })

  it('subscribes through generated property metadata including inherited getters', () => {
    const native = fake()
    const stop = vi.fn()
    vi.mocked(native.observe).mockReturnValue(stop)
    setSDKNative(native)
    class Parent extends SDKHandle {}
    class Child extends Parent {}
    registerSDKClass('WireTest.ParentObserved', Parent, { module: 'WireTest', properties: { progress: 23 } })
    registerSDKClass('WireTest.ChildObserved', Child, { module: 'WireTest', properties: {} })
    const object = new Child(handle('WireTest.ChildObserved'))
    const value = vi.fn()
    const error = vi.fn()
    const cancel = observeSDKProperty(object, 'progress', 'kvo', value, error)
    const [module, id, data, handles, kind, dispatch] = vi.mocked(native.observe).mock.calls[0]
    expect([module, id, data, handles, kind]).toEqual([
      'WireTest', 23, { self: { $h: 0 }, args: [] }, [object.$handle], 'kvo',
    ])
    dispatch(reply(0.5))
    expect(value).toHaveBeenCalledWith(0.5)
    dispatch({ data: { error: 'observation failed' }, handles: [] })
    expect(error.mock.calls[0][0].message).toBe('observation failed')
    cancel()
    expect(stop).toHaveBeenCalledOnce()
    expect(() => observeSDKProperty(object, 'typo', 'kvo', value, error)).toThrow('unregistered SDK property')
  })

  it('subscribes to native publishers and sequences through their handles', () => {
    const native = fake()
    vi.mocked(native.subscribe).mockReturnValue(() => {})
    setSDKNative(native)
    const object = new SDKHandle(handle('WireTest.Publisher'))
    const value = vi.fn()
    subscribeSDK(object, 'publisher', value, vi.fn())
    const [receiver, kind, dispatch] = vi.mocked(native.subscribe).mock.calls[0]
    expect(receiver).toBe(object.$handle)
    expect(kind).toBe('publisher')
    dispatch(reply({ nested: [null, false] }))
    expect(value).toHaveBeenCalledWith({ nested: [null, false] })
    subscribeSDK(object, 'sequence', value, vi.fn())
    expect(vi.mocked(native.subscribe).mock.calls[1][1]).toBe('sequence')
  })

  it('wraps registered classes and uses generic handles until a framework loads', () => {
    const h = handle('WireTest.Lazy')
    expect(decodeSDKResult(h)).toBeInstanceOf(SDKHandle)
    class Lazy extends SDKHandle {}
    registerSDKClass(h.typeName, Lazy)
    const wrapped = decodeSDKResult(h)
    expect(wrapped).toBeInstanceOf(Lazy)
    expect(decodeSDKResult(h)).toBe(wrapped)
    class Generic extends SDKHandle {}
    registerSDKClass('WireTest.Generic', Generic)
    expect(
      decodeSDKResult(handle('WireTest.Generic<Swift.Int>'))
    ).toBeInstanceOf(Generic)
  })

  it('wraps a private subclass in its nearest registered superclass', () => {
    class Sample extends SDKHandle {}
    class Quantity extends Sample {}
    registerSDKClass('WireTestSample', Sample)
    registerSDKClass('WireTestQuantity', Quantity)
    const h = handle('__WireTestPrivateQuantity', {
      superclasses: ['WireTestQuantity', 'WireTestSample'],
    })
    expect(decodeSDKResult(h)).toBeInstanceOf(Quantity)
    const sample = handle('__WireTestPrivateSample', {
      superclasses: ['__WireTestHidden', 'WireTestSample'],
    })
    expect(decodeSDKResult(sample)).toBeInstanceOf(Sample)
  })

  it('retains an escaping callback and decodes its native arguments', () => {
    const native = fake()
    setSDKNative(native)
    const cb = vi.fn()
    callSDK('WireTest', 2, undefined, [cb])
    const [, , , envelope, , dispatch] = vi.mocked(native.call).mock.calls[0]
    expect((envelope as OneSDKResult).data.args).toEqual([{ $f: 0 }])
    dispatch!(0, { args: [{ $date: 123 }, 'poweredOn'] }, [])
    expect(cb).toHaveBeenCalledWith(new Date(123), 'poweredOn')
  })

  it('maps protocol method names back to their Swift titles', () => {
    const native = fake()
    setSDKNative(native)
    registerSDKProtocol('wire:Delegate', {
      centralManagerDidUpdateState: 'centralManagerDidUpdateState(_:)',
    })
    const cb = vi.fn()
    callSDK(
      'WireTest',
      3,
      undefined,
      [{ centralManagerDidUpdateState: cb }],
      [{ protocol: 'wire:Delegate' }]
    )
    const [, , , envelope, , dispatch] = vi.mocked(native.call).mock.calls[0]
    expect(((envelope as OneSDKResult).data.args as AnyMap[string][])[0]).toEqual({
      $impl: 'wire:Delegate',
      methods: { 'centralManagerDidUpdateState(_:)': { $f: 0 } },
    })
    dispatch!(0, { args: [] }, [])
    expect(cb).toHaveBeenCalledOnce()
    expect(() =>
      callSDK('WireTest', 3, undefined, [{ typo() {} }], [{ protocol: 'wire:Delegate' }])
    ).toThrow('unknown SDK protocol method typo')
  })

  it('returns synchronous callback values and written stop flags', () => {
    const native = fake()
    setSDKNative(native)
    vi.mocked(native.callSync).mockImplementation(
      (_module, _id, envelope, _dispatch, syncDispatch) => {
        const args = envelope.data.args as { $f: number }[]
        const index = args[0].$f
        const result = syncDispatch(index, { args: [17, false] }, [])
        expect(result.data).toEqual({ args: [23, 17, true] })
        return reply({ $ret: null, $out: { stop: true } })
      }
    )
    expect(
      callSDK(
        'WireTest',
        4,
        undefined,
        [
          (value: number, stop: NativeOut<boolean>) => {
            stop.value = true
            return value + 6
          },
        ],
        [{ callback: { out: [1] } }],
        true
      )
    ).toEqual({ $ret: null, $out: { stop: true } })
  })

  it('propagates synchronous callback failures in the native reply', () => {
    const native = fake()
    setSDKNative(native)
    vi.mocked(native.callSync).mockImplementation(
      (_module, _id, _envelope, _dispatch, syncDispatch) => {
        expect(syncDispatch(0, { args: [] }, []).data).toEqual({
          error: 'stop enumeration',
        })
        return null
      }
    )
    callSDK(
      'WireTest',
      5,
      undefined,
      [
        () => {
          throw new Error('stop enumeration')
        },
      ],
      [],
      true
    )
  })

  it('turns a returned callable handle into an async function and sends it back as a handle', async () => {
    const native = fake()
    setSDKNative(native)
    const h = handle('One.OneSDKCallable', { callable: true })
    vi.mocked(native.callFunction).mockImplementation(async (receiver, arg0) => {
      expect(receiver).toBe(h)
      expect(arg0).toBe(21)
      return 42
    })
    const fn = decodeSDKResult<(value: number) => Promise<number>>(h)
    expect(await fn(21)).toBe(42)
    callSDK('WireTest', 6, undefined, [fn])
    expect(vi.mocked(native.call).mock.calls[0]).toEqual(['WireTest', 6, undefined, h])
  })

  it('preserves default argument positions and rejects invalid wire values', () => {
    const native = fake()
    setSDKNative(native)
    callSDK('WireTest', 7, undefined, [1, undefined, 3, undefined])
    expect(((vi.mocked(native.call).mock.calls[0][3] as OneSDKResult).data.args)).toEqual([
      1,
      null,
      3,
    ])
    expect(() => callSDK('WireTest', 7, undefined, [1n])).toThrow('cannot encode')
    expect(() => decodeSDKResult(reply({ $h: 0 }))).toThrow('missing SDK handle')
  })

  it('passes string enum receivers through the same native surface', () => {
    const native = fake()
    setSDKNative(native)
    callSDK('WireTest', 8, 'poweredOn', [])
    expect(vi.mocked(native.call).mock.calls[0][2]).toBe('poweredOn')
  })

  it('rejects a Promise returned from a synchronous callback', () => {
    const native = fake()
    setSDKNative(native)
    vi.mocked(native.callSync).mockImplementation(
      (_module, _id, _envelope, _dispatch, syncDispatch) => {
        expect(syncDispatch(0, { args: [] }, []).data).toEqual({
          error: 'a synchronous SDK callback returned a Promise',
        })
        return null
      }
    )
    callSDK('WireTest', 9, undefined, [() => Promise.resolve(1)], [], true)
  })
})
