import { describe, expect, test } from 'vitest'

// set this up for testing, pausing
async function fetchDevAndProd(path = '/', type: 'text' | 'json') {
  return await Promise.all([
    fetch(`http://localhost:3111${path}`).then((res) => res[type]()),
    fetch(`http://localhost:3112${path}`).then((res) => res[type]()),
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

  test('root middleware does and return new response', async () => {
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
})
