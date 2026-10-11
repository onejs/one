import { describe, expect, it } from 'vitest'
import type { NativeSourceStructs, NativeSourceWire } from './wire.native'
import {
  base64Decode,
  base64Encode,
  decodeNativeSourceCallback,
  decodeNativeSourceResult,
  encodeNativeSourceArgs,
} from './wire.native'

const structs: NativeSourceStructs = {
  Point: {
    fields: [
      { name: 'x', optional: false },
      { name: 'y', optional: false },
      { name: 'label', optional: true },
      {
        name: 'at',
        optional: true,
        wire: { kind: 'nullable', inner: { kind: 'date' } },
      },
    ],
  },
}

describe('native source wire base64', () => {
  it('round-trips bytes without globals', () => {
    const vectors: [number[], string][] = [
      [[], ''],
      [[102], 'Zg=='],
      [[102, 111], 'Zm8='],
      [[102, 111, 111], 'Zm9v'],
      [[0, 255, 128, 1], 'AP+AAQ=='],
    ]
    for (const [bytes, text] of vectors) {
      expect(base64Encode(new Uint8Array(bytes))).toBe(text)
      expect(Array.from(base64Decode(text))).toEqual(bytes)
    }
    expect(() => base64Decode('!!!')).toThrow()
  })
})

describe('native source wire encode', () => {
  it('keeps dates for stringify and encodes bytes as base64', () => {
    const when = new Date('2026-10-11T12:00:00.000Z')
    const [date, data] = encodeNativeSourceArgs(
      [when, new Uint8Array([1, 2, 3])],
      [{ kind: 'date' }, { kind: 'data' }],
      {}
    )
    expect(date).toBe(when)
    expect(data).toBe('AQID')
    expect(JSON.stringify(date)).toBe('"2026-10-11T12:00:00.000Z"')
  })

  it('walks structs and rejects missing or mistyped payloads', () => {
    const wire: NativeSourceWire = { kind: 'struct', name: 'Point' }
    const [point] = encodeNativeSourceArgs(
      [{ x: 1, y: 2, at: new Date('2026-01-01T00:00:00.000Z') }],
      [wire],
      structs
    )
    expect(point).toEqual({ x: 1, y: 2, at: new Date('2026-01-01T00:00:00.000Z') })
    // a missing required field fails fast with its path
    expect(() => encodeNativeSourceArgs([{ x: 1 }], [wire], structs)).toThrow('args[0].y: required')
    // dates reject strings, bytes reject arrays, structs reject arrays
    expect(() => encodeNativeSourceArgs(['2026-01-01'], [{ kind: 'date' }], {})).toThrow(
      'args[0]: expected Date'
    )
    expect(() => encodeNativeSourceArgs([[1]], [{ kind: 'data' }], {})).toThrow(
      'args[0]: expected Uint8Array'
    )
    expect(() => encodeNativeSourceArgs([[]], [wire], structs)).toThrow('args[0]: expected Point')
    // arguments without a wire pass through untouched
    expect(encodeNativeSourceArgs([1, 'two'], [undefined, null], {})).toEqual([1, 'two'])
  })
})

describe('native source wire decode', () => {
  it('revives dates and bytes and walks structs', () => {
    const date = decodeNativeSourceResult('2026-10-11T12:00:00.000Z', { kind: 'date' }, {})
    expect(date).toBeInstanceOf(Date)
    expect((date as Date).toISOString()).toBe('2026-10-11T12:00:00.000Z')
    const bytes = decodeNativeSourceResult('AQID', { kind: 'data' }, {}) as Uint8Array
    expect(Array.from(bytes)).toEqual([1, 2, 3])
    const point = decodeNativeSourceResult(
      { x: 1, y: 2, at: '2026-01-01T00:00:00.000Z' },
      { kind: 'struct', name: 'Point' },
      structs
    ) as Record<string, unknown>
    expect(point['at']).toBeInstanceOf(Date)
    expect(point).toEqual({ x: 1, y: 2, at: new Date('2026-01-01T00:00:00.000Z') })
  })

  it('rejects unparseable payloads with their path', () => {
    expect(() => decodeNativeSourceResult('yesterday', { kind: 'date' }, {})).toThrow(
      'result: expected an ISO date string'
    )
    expect(() => decodeNativeSourceResult('!!!', { kind: 'data' }, {})).toThrow(
      'result: expected base64 data'
    )
    expect(() =>
      decodeNativeSourceResult({ x: 1 }, { kind: 'struct', name: 'Point' }, structs)
    ).toThrow('result.y: required')
    expect(() => decodeNativeSourceResult(1, { kind: 'array', element: { kind: 'date' } }, {})).toThrow(
      'result: expected an array'
    )
    expect(decodeNativeSourceResult('plain', undefined, {})).toBe('plain')
  })

  it('revives callback arguments by position', () => {
    const [first, second] = decodeNativeSourceCallback(
      ['2026-10-11T12:00:00.000Z', 7],
      [{ kind: 'date' }, null],
      {},
      'onTick'
    )
    expect(first).toBeInstanceOf(Date)
    expect(second).toBe(7)
  })
})
