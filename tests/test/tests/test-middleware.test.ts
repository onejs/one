import { describe, expect, test } from 'vitest'

// set this up for testing, pausing
async function fetchDevAndProd(path = '/', type: 'text' | 'json' | 'headers') {
  return await Promise.all([
    fetch(`http://localhost:3111${path}`).then((res) => {
      if (type === 'headers') {
        return res.headers
      }
      return res[type]()
    }),
    fetch(`http://localhost:3112${path}`).then((res) => {
      if (type === 'headers') {
        return res.headers
      }
      return res[type]()
    }),
  ] as const)
}

describe('Middleware', () => {
  test('root middleware doesnt intercept', async () => {
    const [devRes, prodRes] = await fetchDevAndProd('/', 'text')
    expect(devRes).includes(`<html`)
    expect(prodRes).includes(`<html`)
    expect(devRes).includes(`Welcome to VXS`)
    expect(prodRes).includes(`Welcome to VXS`)
  })

  test('root middleware intercept and return new response', async () => {
    const [devRes, prodRes] = await fetchDevAndProd('/middleware?test-middleware', 'json')
    expect(JSON.stringify(devRes)).toBe(JSON.stringify(prodRes))
    expect(devRes).toMatchInlineSnapshot()
    // TODO breaking
    // we serve static from /Users/n8/one/node_modules/vxrn/src/exports/createServer.ts
    // but if there's a middleware now we need to not serve static
    // need to make some decisions here...
    //  - ssg routes never run middlewares? that makes things easier
    // expect(prodRes).toMatchInlineSnapshot()
  })

  test('sub middleware runs and changes headers', async () => {
    const [devRes, prodRes] = (await fetchDevAndProd('/middleware', 'headers')) as Headers[]
    expect(devRes.get('test-header')).toBe(prodRes.get('test-header'))
    expect(devRes).toBe('test-value')
  })

  test('sub middleware runs and changes response before parent middleware', async () => {
    const [devRes, prodRes] = await fetchDevAndProd('/middleware?test-middleware', 'json')
    expect(JSON.stringify(devRes)).toBe(JSON.stringify(prodRes))
    expect(devRes).toMatchInlineSnapshot()
  })

  // test('root middleware no response return custom response', async () => {
  //   const [devRes, prodRes] = await fetchDevAndProd('/missing-route', 'json')
  //   expect(JSON.stringify(devRes)).toBe(JSON.stringify(prodRes))
  //   expect(devRes).toMatchInlineSnapshot()
  // })
})
