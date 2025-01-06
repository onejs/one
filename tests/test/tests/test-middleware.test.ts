import { describe, expect, test } from 'vitest'
import { fetchDevAndProd } from './utils/fetchDevAndProd'

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
    expect(devRes).toMatchInlineSnapshot(`
      {
        "middleware": "works",
      }
    `)
  })

  test('parent middleware runs and changes response before sub middleware', async () => {
    const [devRes, prodRes] = await fetchDevAndProd('/middleware?test-middleware&intercept', 'json')
    expect(JSON.stringify(devRes)).toBe(JSON.stringify(prodRes))
    expect(devRes).toMatchInlineSnapshot(`
      {
        "middleware": "works",
      }
    `)
  })

  // test('sub middleware intercepts', async () => {
  //   const [devRes, prodRes] = await fetchDevAndProd('/middleware?intercept', 'json')
  //   expect(JSON.stringify(devRes)).toBe(JSON.stringify(prodRes))
  //   expect(devRes).toMatchInlineSnapshot(`
  //     {
  //       "didIntercept": true,
  //     }
  //   `)
  // })

  test('sub middleware runs and changes headers', async () => {
    const [devRes, prodRes] = (await fetchDevAndProd('/middleware', 'headers')) as Headers[]
    // TODO intercept not working
    // expect(devRes.get('test-header')).toBe(prodRes.get('test-header'))
    expect(devRes.get('test-header')).toBe('test-value')
  })
})
