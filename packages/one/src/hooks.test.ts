import { describe, expect, it } from 'vitest'

// test the ReadOnlyURLSearchParams behavior directly
// (hooks require React context, so we test the URLSearchParams logic separately)

class ReadOnlyURLSearchParams extends URLSearchParams {
  override set(_name: string, _value: string): void {
    throw new Error('useSearchParams returns a read-only URLSearchParams object')
  }
  override append(_name: string, _value: string): void {
    throw new Error('useSearchParams returns a read-only URLSearchParams object')
  }
  override delete(_name: string, _value?: string): void {
    throw new Error('useSearchParams returns a read-only URLSearchParams object')
  }
}

describe('ReadOnlyURLSearchParams', () => {
  it('should allow reading values', () => {
    const params = new ReadOnlyURLSearchParams([
      ['sort', 'price'],
      ['category', 'electronics'],
    ])

    expect(params.get('sort')).toBe('price')
    expect(params.get('category')).toBe('electronics')
    expect(params.get('nonexistent')).toBe(null)
  })

  it('should support has()', () => {
    const params = new ReadOnlyURLSearchParams([['key', 'value']])

    expect(params.has('key')).toBe(true)
    expect(params.has('missing')).toBe(false)
  })

  it('should support getAll() for repeated params', () => {
    const params = new ReadOnlyURLSearchParams([
      ['tag', 'a'],
      ['tag', 'b'],
      ['tag', 'c'],
    ])

    expect(params.getAll('tag')).toEqual(['a', 'b', 'c'])
  })

  it('should support iteration', () => {
    const params = new ReadOnlyURLSearchParams([
      ['a', '1'],
      ['b', '2'],
    ])

    const entries = Array.from(params.entries())
    expect(entries).toEqual([
      ['a', '1'],
      ['b', '2'],
    ])
  })

  it('should support toString()', () => {
    const params = new ReadOnlyURLSearchParams([
      ['sort', 'price'],
      ['page', '1'],
    ])

    expect(params.toString()).toBe('sort=price&page=1')
  })

  it('should throw on set()', () => {
    const params = new ReadOnlyURLSearchParams([['key', 'value']])

    expect(() => params.set('key', 'new')).toThrow(
      'useSearchParams returns a read-only URLSearchParams object'
    )
  })

  it('should throw on append()', () => {
    const params = new ReadOnlyURLSearchParams([['key', 'value']])

    expect(() => params.append('key', 'another')).toThrow(
      'useSearchParams returns a read-only URLSearchParams object'
    )
  })

  it('should throw on delete()', () => {
    const params = new ReadOnlyURLSearchParams([['key', 'value']])

    expect(() => params.delete('key')).toThrow(
      'useSearchParams returns a read-only URLSearchParams object'
    )
  })
})

describe('useSearchParams param conversion', () => {
  // test the logic that converts params object to URLSearchParams entries

  function paramsToEntries(
    params: Record<string, string | string[] | undefined>
  ): [string, string][] {
    return Object.entries(params).flatMap(([key, value]) => {
      if (value === undefined) return []
      return Array.isArray(value)
        ? value.map((v) => [key, String(v)] as [string, string])
        : [[key, String(value)] as [string, string]]
    })
  }

  it('should convert simple string params', () => {
    const params = { sort: 'price', page: '1' }
    const entries = paramsToEntries(params)

    expect(entries).toEqual([
      ['sort', 'price'],
      ['page', '1'],
    ])
  })

  it('should expand array params into multiple entries', () => {
    const params = { tags: ['a', 'b', 'c'] }
    const entries = paramsToEntries(params)

    expect(entries).toEqual([
      ['tags', 'a'],
      ['tags', 'b'],
      ['tags', 'c'],
    ])
  })

  it('should filter out undefined values', () => {
    const params = { present: 'yes', missing: undefined }
    const entries = paramsToEntries(params)

    expect(entries).toEqual([['present', 'yes']])
  })

  it('should handle mixed params', () => {
    const params = {
      single: 'value',
      multiple: ['x', 'y'],
      absent: undefined,
    }
    const entries = paramsToEntries(params)

    expect(entries).toEqual([
      ['single', 'value'],
      ['multiple', 'x'],
      ['multiple', 'y'],
    ])
  })

  it('should handle empty params', () => {
    const params = {}
    const entries = paramsToEntries(params)

    expect(entries).toEqual([])
  })
})
