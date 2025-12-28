/**
 * Comprehensive Cloudflare Deployment Tests
 *
 * These tests verify that the One framework correctly generates and serves
 * Cloudflare Workers for:
 * - API routes (GET, POST, dynamic params)
 * - SSR pages with loaders
 * - SPA pages
 * - SSG pages
 * - Client-side navigation
 * - Dynamic routes
 */

import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:3457'
const isDebug = !!process.env.DEBUG

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

describe('Cloudflare API Routes', () => {
  it('should handle basic GET request', async () => {
    const response = await fetch(`${serverUrl}/api/hello`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.message).toBe('Hello from One API!')
    expect(data.timestamp).toBeDefined()
  })

  it('should handle POST request with body', async () => {
    const response = await fetch(`${serverUrl}/api/hello`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'One Test' }),
    })

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.message).toBe('Hello, One Test!')
    expect(data.received.name).toBe('One Test')
  })

  it('should handle dynamic route parameters', async () => {
    const response = await fetch(`${serverUrl}/api/echo/my-param?query=test-value`)
    expect(response.status).toBe(200)

    const data = await response.json()
    expect(data.param).toBe('my-param')
    expect(data.query).toBe('test-value')
  })

  it('should handle POST with dynamic params', async () => {
    const response = await fetch(`${serverUrl}/api/echo/dynamic-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: 'test' }),
    })

    expect(response.status).toBe(201)

    const data = await response.json()
    expect(data.param).toBe('dynamic-post')
    expect(data.body.data).toBe('test')
  })
})

describe('Cloudflare SSG Pages', () => {
  it('should render SSG home page', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl)

    expect(await page.textContent('#home-title')).toBe('One Test Home')
    expect(await page.textContent('#render-mode')).toBe('Mode: SSG (default)')

    await page.close()
  })

  it('should have working navigation links', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl)

    // Check all navigation links exist
    expect(await page.$('#link-ssr')).toBeTruthy()
    expect(await page.$('#link-spa')).toBeTruthy()
    expect(await page.$('#link-api-test')).toBeTruthy()
    expect(await page.$('#link-dynamic')).toBeTruthy()

    await page.close()
  })
})

describe('Cloudflare SSR Pages', () => {
  it('should render SSR page with loader data', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/ssr-page`)

    expect(await page.textContent('#ssr-title')).toBe('SSR Page')
    expect(await page.textContent('#render-mode')).toBe('Mode: SSR')
    expect(await page.textContent('#loader-message')).toBe('Hello from SSR loader!')
    expect(await page.textContent('#loader-path')).toBe('Path: /ssr-page')

    await page.close()
  })

  it('should pass query params to SSR loader', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/ssr-page?foo=bar&test=123`)

    const query = await page.textContent('#loader-query')
    const queryData = JSON.parse(query?.replace('Query: ', '') || '{}')

    expect(queryData.foo).toBe('bar')
    expect(queryData.test).toBe('123')

    await page.close()
  })

  it('should have fresh timestamp on each request', async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/ssr-page`)
    const timestamp1Text = await page.textContent('#loader-timestamp')
    const timestamp1 = Number(timestamp1Text?.replace('Timestamp: ', ''))

    await new Promise((r) => setTimeout(r, 100))

    await page.goto(`${serverUrl}/ssr-page`)
    const timestamp2Text = await page.textContent('#loader-timestamp')
    const timestamp2 = Number(timestamp2Text?.replace('Timestamp: ', ''))

    expect(timestamp2).toBeGreaterThan(timestamp1)

    await page.close()
  })
})

describe('Cloudflare SPA Pages', () => {
  it('should render SPA page', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/spa-page`)

    // Wait for client-side hydration
    await page.waitForTimeout(1000)

    expect(await page.textContent('#spa-title')).toBe('SPA Page')
    expect(await page.textContent('#render-mode')).toBe('Mode: SPA')

    await page.close()
  })

  it('should have working client-side interactivity', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/spa-page`)

    await page.waitForTimeout(500)

    expect(await page.textContent('#counter')).toBe('Count: 0')

    await page.click('#increment-btn')
    expect(await page.textContent('#counter')).toBe('Count: 1')

    await page.click('#increment-btn')
    await page.click('#increment-btn')
    expect(await page.textContent('#counter')).toBe('Count: 3')

    await page.close()
  })
})

describe('Cloudflare Dynamic Routes', () => {
  it('should render dynamic SSR page with correct params', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/dynamic/123`)

    expect(await page.textContent('#dynamic-title')).toBe('Dynamic Page')
    expect(await page.textContent('#param-id')).toBe('Param ID: 123')
    expect(await page.textContent('#loader-id')).toBe('Loader ID: 123')
    expect(await page.textContent('#loader-message')).toBe('Dynamic page for ID: 123')

    await page.close()
  })

  it('should work with different param values', async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/dynamic/abc-xyz`)
    expect(await page.textContent('#param-id')).toBe('Param ID: abc-xyz')

    await page.goto(`${serverUrl}/dynamic/999`)
    expect(await page.textContent('#param-id')).toBe('Param ID: 999')

    await page.close()
  })
})

describe('Cloudflare Client-Side Navigation', () => {
  it('should navigate from SSG to SSR page', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl)

    await page.click('#link-ssr')
    await page.waitForURL(`${serverUrl}/ssr-page`)

    expect(await page.textContent('#ssr-title')).toBe('SSR Page')

    await page.close()
  })

  it('should navigate from SSG to SPA page', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl)

    await page.click('#link-spa')
    await page.waitForURL(`${serverUrl}/spa-page`)

    await page.waitForTimeout(500)
    expect(await page.textContent('#spa-title')).toBe('SPA Page')

    await page.close()
  })

  it('should navigate from SSG to dynamic route', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl)

    await page.click('#link-dynamic')
    await page.waitForURL(`${serverUrl}/dynamic/123`)

    expect(await page.textContent('#param-id')).toBe('Param ID: 123')

    await page.close()
  })

  it('should navigate between dynamic routes', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/dynamic/123`)

    expect(await page.textContent('#param-id')).toBe('Param ID: 123')

    await page.click('#link-other-dynamic')
    await page.waitForURL(`${serverUrl}/dynamic/456`)

    expect(await page.textContent('#param-id')).toBe('Param ID: 456')

    await page.close()
  })

  it('should navigate back to home', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/ssr-page`)

    await page.click('#link-home')
    await page.waitForURL(serverUrl + '/')

    expect(await page.textContent('#home-title')).toBe('One Test Home')

    await page.close()
  })
})

describe('Cloudflare API Test Page Integration', () => {
  it('should show API results on the test page', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/api-test`)

    // Wait for API calls to complete
    await page.waitForTimeout(2000)

    const basicResult = await page.textContent('#basic-api-result')
    expect(basicResult).toContain('Hello from One API!')

    const paramsResult = await page.textContent('#params-api-result')
    expect(paramsResult).toContain('test-value')

    await page.close()
  })

  it('should handle POST from the test page', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/api-test`)

    await page.click('#test-post-btn')
    await page.waitForTimeout(1000)

    const postResult = await page.textContent('#post-api-result')
    expect(postResult).toContain('Hello, One Test!')

    await page.close()
  })
})

describe('Cloudflare Build Output Validation', () => {
  it('should have correct Content-Type headers for API responses', async () => {
    const response = await fetch(`${serverUrl}/api/hello`)
    expect(response.headers.get('content-type')).toContain('application/json')
  })

  it('should have correct Content-Type headers for HTML pages', async () => {
    const response = await fetch(serverUrl)
    expect(response.headers.get('content-type')).toContain('text/html')
  })

  it('should serve static assets correctly', async () => {
    const page = await context.newPage()
    const response = await page.goto(serverUrl)

    // Page should load successfully
    expect(response?.status()).toBe(200)

    // Check that JavaScript is being served (by checking for client-side hydration)
    await page.waitForTimeout(1000)
    const hasReactRoot = await page.evaluate(() => {
      return document.querySelector('#home-title') !== null
    })
    expect(hasReactRoot).toBe(true)

    await page.close()
  })
})
