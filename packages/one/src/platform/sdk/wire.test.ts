import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  SDKHandle,
  callSDK,
  callSDKAsync,
  decodeSDKResult,
  registerSDKClass,
  registerSDKProtocol,
  setSDKNative,
  type NativeOut,
  type SDKNative,
  type OneSDKHandle,
} from './wire'

const handle = (typeName: string) => ({ typeName }) as OneSDKHandle
const reply = (value: unknown, handles: OneSDKHandle[] = []) => ({
  json: JSON.stringify(value ?? null),
  handles,
})
function fake(): SDKNative {
  return {
    call: vi.fn((_module, _id, json, handles) =>
      reply(JSON.parse(json).args[0], handles)
    ),
    callAsync: vi.fn(async (_module, _id, json, handles) =>
      reply(JSON.parse(json).args[0], handles)
    ),
    callSync: vi.fn(),
    callFunction: vi.fn(),
  }
}

afterEach(() => vi.restoreAllMocks())

describe('SDK wire', () => {
  it('round-trips handles, dates, bytes, enums and nested values through native', async () => {
    const native = fake()
    setSDKNative(native)
    const h = handle('WireTest.Value')
    const wrapped = new SDKHandle(h)
    const date = new Date('2026-10-17T10:00:00Z')
    const data = new Uint8Array([0, 1, 127, 128, 255]).buffer
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
    const [, , json, handles] = vi.mocked(native.call).mock.calls[0]
    expect(JSON.parse(json).self).toEqual({ $h: 0 })
    expect(handles).toEqual([h])
  })

  it('wraps registered classes and uses generic handles until a framework loads', () => {
    const h = handle('WireTest.Lazy')
    const result = reply({ $h: 0, $t: h.typeName }, [h])
    expect(decodeSDKResult(result)).toBeInstanceOf(SDKHandle)
    class Lazy extends SDKHandle {}
    registerSDKClass(h.typeName, Lazy)
    const wrapped = decodeSDKResult(result)
    expect(wrapped).toBeInstanceOf(Lazy)
    expect(decodeSDKResult(result)).toBe(wrapped)
    class Generic extends SDKHandle {}
    registerSDKClass('WireTest.Generic', Generic)
    expect(
      decodeSDKResult(reply({ $h: 0, $t: 'WireTest.Generic<Swift.Int>' }, [h]))
    ).toBeInstanceOf(Generic)
  })

  it('wraps a private subclass in its nearest registered superclass', () => {
    class Sample extends SDKHandle {}
    class Quantity extends Sample {}
    registerSDKClass('WireTestSample', Sample)
    registerSDKClass('WireTestQuantity', Quantity)
    const h = handle('__WireTestPrivateQuantity')
    expect(
      decodeSDKResult(reply({ $h: 0, $t: h.typeName, $s: ['WireTestQuantity', 'WireTestSample'] }, [h]))
    ).toBeInstanceOf(Quantity)
    const sample = handle('__WireTestPrivateSample')
    expect(
      decodeSDKResult(reply({ $h: 0, $t: sample.typeName, $s: ['__WireTestHidden', 'WireTestSample'] }, [sample]))
    ).toBeInstanceOf(Sample)
  })

  it('retains an escaping callback and decodes its native arguments', () => {
    const native = fake()
    setSDKNative(native)
    const cb = vi.fn()
    callSDK('WireTest', 2, undefined, [cb])
    const [, , json, , dispatch] = vi.mocked(native.call).mock.calls[0]
    expect(JSON.parse(json).args).toEqual([{ $f: 0 }])
    dispatch(0, JSON.stringify([{ $date: 123 }, 'poweredOn']), [])
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
    const [, , json, , dispatch] = vi.mocked(native.call).mock.calls[0]
    expect(JSON.parse(json).args[0]).toEqual({
      $impl: 'wire:Delegate',
      methods: { 'centralManagerDidUpdateState(_:)': { $f: 0 } },
    })
    dispatch(0, '[]', [])
    expect(cb).toHaveBeenCalledOnce()
    expect(() =>
      callSDK('WireTest', 3, undefined, [{ typo() {} }], [{ protocol: 'wire:Delegate' }])
    ).toThrow('unknown SDK protocol method typo')
  })

  it('returns synchronous callback values and written stop flags', () => {
    const native = fake()
    setSDKNative(native)
    vi.mocked(native.callSync).mockImplementation(
      (_module, _id, json, _handles, _dispatch, syncDispatch) => {
        const index = JSON.parse(json).args[0].$f
        const result = syncDispatch(index, '[17,false]', [])
        expect(JSON.parse(result.json)).toEqual({ args: [23, 17, true] })
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
      (_module, _id, _json, _handles, _dispatch, syncDispatch) => {
        expect(JSON.parse(syncDispatch(0, '[]', []).json)).toEqual({
          error: 'stop enumeration',
        })
        return reply(null)
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
    const h = handle('One.OneSDKCallable')
    vi.mocked(native.callFunction).mockImplementation(async (receiver, json) => {
      expect(receiver).toBe(h)
      expect(JSON.parse(json)).toEqual({ args: [21] })
      return reply(42)
    })
    const fn = decodeSDKResult<(value: number) => Promise<number>>(
      reply({ $h: 0, $t: h.typeName, $fn: true }, [h])
    )
    expect(await fn(21)).toBe(42)
    callSDK('WireTest', 6, undefined, [fn])
    const [, , json, handles] = vi.mocked(native.call).mock.calls[0]
    expect(JSON.parse(json)).toEqual({ args: [{ $h: 0 }] })
    expect(handles).toEqual([h])
  })

  it('preserves default argument positions and rejects invalid wire values', () => {
    const native = fake()
    setSDKNative(native)
    callSDK('WireTest', 7, undefined, [1, undefined, 3, undefined])
    expect(JSON.parse(vi.mocked(native.call).mock.calls[0][2]).args).toEqual([1, null, 3])
    expect(() => callSDK('WireTest', 7, undefined, [NaN])).toThrow('cannot encode')
    expect(() => decodeSDKResult(reply({ $h: 0 }))).toThrow('missing SDK handle')
  })

  it('passes string enum receivers through the same native surface', () => {
    const native = fake()
    setSDKNative(native)
    callSDK('WireTest', 8, 'poweredOn', [])
    expect(JSON.parse(vi.mocked(native.call).mock.calls[0][2]).self).toBe('poweredOn')
  })

  it('rejects a Promise returned from a synchronous callback', () => {
    const native = fake()
    setSDKNative(native)
    vi.mocked(native.callSync).mockImplementation(
      (_module, _id, _json, _handles, _dispatch, syncDispatch) => {
        expect(JSON.parse(syncDispatch(0, '[]', []).json)).toEqual({
          error: 'a synchronous SDK callback returned a Promise',
        })
        return reply(null)
      }
    )
    callSDK('WireTest', 9, undefined, [() => Promise.resolve(1)], [], true)
  })
})
