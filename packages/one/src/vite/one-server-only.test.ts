import { describe, expect, it } from 'vitest'
import { mergeHeaders } from './one-server-only'

describe('mergeHeaders', () => {
  it('merges regular headers', () => {
    const onto = new Headers({ 'content-type': 'text/html' })
    const from = new Headers({ 'x-custom': 'value' })
    mergeHeaders(onto, from)
    expect(onto.get('content-type')).toBe('text/html')
    expect(onto.get('x-custom')).toBe('value')
  })

  it('overrides existing headers with set()', () => {
    const onto = new Headers({ 'cache-control': 'no-cache' })
    const from = new Headers({ 'cache-control': 'max-age=3600' })
    mergeHeaders(onto, from)
    expect(onto.get('cache-control')).toBe('max-age=3600')
  })

  it('deletes headers when value is undefined', () => {
    const onto = new Headers({ 'x-remove': 'present' })
    const from = new Headers()
    from.set('x-remove', 'undefined')
    mergeHeaders(onto, from)
    expect(onto.has('x-remove')).toBe(false)
  })

  it('preserves multiple set-cookie headers from source', () => {
    const onto = new Headers()
    const from = new Headers()
    from.append('set-cookie', 'session=abc123; Path=/; HttpOnly')
    from.append('set-cookie', 'theme=dark; Path=/')

    mergeHeaders(onto, from)

    const cookies = onto.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies).toContain('session=abc123; Path=/; HttpOnly')
    expect(cookies).toContain('theme=dark; Path=/')
  })

  it('preserves existing set-cookie headers on target when merging', () => {
    const onto = new Headers()
    onto.append('set-cookie', 'existing=keep; Path=/')

    const from = new Headers()
    from.append('set-cookie', 'new=added; Path=/')

    mergeHeaders(onto, from)

    const cookies = onto.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies).toContain('existing=keep; Path=/')
    expect(cookies).toContain('new=added; Path=/')
  })

  it('handles three or more set-cookie headers', () => {
    const onto = new Headers()
    const from = new Headers()
    from.append('set-cookie', 'a=1; Path=/')
    from.append('set-cookie', 'b=2; Path=/')
    from.append('set-cookie', 'c=3; Path=/')

    mergeHeaders(onto, from)

    const cookies = onto.getSetCookie()
    expect(cookies).toHaveLength(3)
    expect(cookies).toContain('a=1; Path=/')
    expect(cookies).toContain('b=2; Path=/')
    expect(cookies).toContain('c=3; Path=/')
  })

  it('merges set-cookie alongside regular headers', () => {
    const onto = new Headers()
    const from = new Headers({ 'content-type': 'text/html' })
    from.append('set-cookie', 'session=abc; Path=/')
    from.append('set-cookie', 'csrf=xyz; Path=/')

    mergeHeaders(onto, from)

    expect(onto.get('content-type')).toBe('text/html')
    const cookies = onto.getSetCookie()
    expect(cookies).toHaveLength(2)
    expect(cookies).toContain('session=abc; Path=/')
    expect(cookies).toContain('csrf=xyz; Path=/')
  })

  it('handles source with no set-cookie headers', () => {
    const onto = new Headers()
    const from = new Headers({ 'x-foo': 'bar' })
    mergeHeaders(onto, from)
    expect(onto.getSetCookie()).toHaveLength(0)
    expect(onto.get('x-foo')).toBe('bar')
  })
})
