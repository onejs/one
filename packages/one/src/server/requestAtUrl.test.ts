import { expect, test } from 'vitest'
import { requestAtUrl } from './requestAtUrl'

function throwOnDuplex(request: Request): Request {
  return new Proxy(request, {
    get(target, prop) {
      if (prop === 'duplex') {
        throw new TypeError('Illegal invocation')
      }
      const value = Reflect.get(target, prop, target)
      return typeof value === 'function' ? value.bind(target) : value
    },
  }) as Request
}

test('rewrites a url without reading duplex', () => {
  const request = throwOnDuplex(
    new Request('http://localhost/assets/_1_vxrn_loader.js?platform=ios', {
      headers: { cookie: 'a=b' },
    })
  )

  expect(() => new Request('http://localhost/', request)).toThrow(/Illegal invocation/)

  const cleaned = requestAtUrl(new URL('http://localhost/?platform=ios'), request)
  expect(cleaned.url).toBe('http://localhost/?platform=ios')
  expect(cleaned.method).toBe('GET')
  expect(cleaned.headers.get('cookie')).toBe('a=b')
  expect(cleaned.body).toBeNull()
})

test('keeps a body without reading duplex', async () => {
  const request = throwOnDuplex(
    new Request('http://localhost/assets/_1_vxrn_loader.js', {
      method: 'POST',
      body: 'hello',
      headers: { 'content-type': 'text/plain' },
    })
  )

  const cleaned = requestAtUrl(new URL('http://localhost/page'), request)
  expect(cleaned.method).toBe('POST')
  expect(cleaned.headers.get('content-type')).toBe('text/plain')
  expect(await cleaned.text()).toBe('hello')
})
