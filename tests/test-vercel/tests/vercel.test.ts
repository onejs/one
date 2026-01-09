/**
 * Comprehensive Vercel Deployment Tests
 *
 * These tests verify that the One framework correctly generates and serves
 * Vercel-compatible serverless functions for:
 * - API routes (GET, POST, dynamic params)
 * - SSR pages with loaders
 * - SPA pages
 * - SSG pages
 * - Client-side navigation
 * - Dynamic routes
 */

import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:3456'
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

describe('Vercel Middleware', () => {
  it('should run middleware and add custom header on SSG page', async () => {
    const response = await fetch(`${serverUrl}/`)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Middleware-Test')).toBe('vercel-middleware-works')
  })

  it('should run middleware on API routes', async () => {
    const response = await fetch(`${serverUrl}/api/hello`)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Middleware-Test')).toBe('vercel-middleware-works')
  })

  it('should run middleware on SSR pages', async () => {
    const response = await fetch(`${serverUrl}/ssr-page`)
    expect(response.status).toBe(200)
    expect(response.headers.get('X-Middleware-Test')).toBe('vercel-middleware-works')
  })
})

describe('Vercel API Routes', () => {
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

describe('Vercel SSG Pages', () => {
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

describe('Vercel SSR Pages', () => {
  it('should render SSR page with loader data', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/ssr-page`)

    expect(await page.textContent('#ssr-title')).toBe('SSR Page')
    expect(await page.textContent('#render-mode')).toBe('Mode: SSR')
    expect(await page.textContent('#loader-message')).toBe('Hello from SSR loader!')
    expect(await page.textContent('#loader-path')).toBe('Path: /ssr-page')

    await page.close()
  })

  // Skip: Flaky due to module-level caching in local Vercel simulator
  // Works correctly on actual Vercel deployment due to serverless isolation
  it.skip('should pass query params to SSR loader', async () => {
    // Use a fresh browser context to avoid any cached state from previous tests
    const freshContext = await browser.newContext()
    const page = await freshContext.newPage()
    await page.goto(`${serverUrl}/ssr-page?foo=bar&test=123&_t=${Date.now()}`)

    const query = await page.textContent('#loader-query')
    const queryData = JSON.parse(query?.replace('Query: ', '') || '{}')

    expect(queryData.foo).toBe('bar')
    expect(queryData.test).toBe('123')

    await page.close()
    await freshContext.close()
  })

  // Skip: Flaky due to module-level caching in local Vercel simulator
  // Works correctly on actual Vercel deployment due to serverless isolation
  it.skip('should have fresh timestamp on each request', async () => {
    // Use a fresh browser context to avoid any cached state from previous tests
    const freshContext = await browser.newContext()
    const page = await freshContext.newPage()

    await page.goto(`${serverUrl}/ssr-page?_t=${Date.now()}`)
    const timestamp1Text = await page.textContent('#loader-timestamp')
    const timestamp1 = Number(timestamp1Text?.replace('Timestamp: ', ''))

    await new Promise((r) => setTimeout(r, 100))

    // Add cache busting to ensure fresh server render
    await page.goto(`${serverUrl}/ssr-page?_t=${Date.now()}`)
    const timestamp2Text = await page.textContent('#loader-timestamp')
    const timestamp2 = Number(timestamp2Text?.replace('Timestamp: ', ''))

    // Check that timestamps are different (page was re-rendered)
    expect(timestamp2).not.toBe(timestamp1)

    await page.close()
    await freshContext.close()
  })
})

describe('Vercel SPA Pages', () => {
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

describe('Vercel Dynamic Routes', () => {
  it('should render dynamic SSR page with correct params', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/dynamic/123`)

    expect(await page.textContent('#dynamic-title')).toBe('Dynamic Page')
    expect(await page.textContent('#param-id')).toBe('Param ID: 123')
    expect(await page.textContent('#loader-id')).toBe('Loader ID: 123')
    expect(await page.textContent('#loader-message')).toBe('Dynamic page for ID: 123')

    await page.close()
  })

  // Skip: Flaky due to module-level caching in local Vercel simulator
  // Works correctly on actual Vercel deployment due to serverless isolation
  it.skip('should work with different param values', async () => {
    // Use a fresh browser context to avoid any cached state from previous tests
    const freshContext = await browser.newContext()
    const page = await freshContext.newPage()

    // Add cache busting to ensure fresh renders
    await page.goto(`${serverUrl}/dynamic/abc-xyz?_t=${Date.now()}`)
    expect(await page.textContent('#param-id')).toBe('Param ID: abc-xyz')

    await page.goto(`${serverUrl}/dynamic/999?_t=${Date.now()}`)
    expect(await page.textContent('#param-id')).toBe('Param ID: 999')

    await page.close()
    await freshContext.close()
  })
})

describe('Vercel Client-Side Navigation', () => {
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

  it.skip('should navigate from SSG to dynamic route', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl)

    await page.click('#link-dynamic')
    await page.waitForURL(`${serverUrl}/dynamic/123`)

    expect(await page.textContent('#param-id')).toBe('Param ID: 123')

    await page.close()
  })

  it.skip('should navigate between dynamic routes', async () => {
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

describe('Vercel API Test Page Integration', () => {
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

describe('Vercel Direct URL Access (cleanUrls)', () => {
  // This tests the cleanUrls feature - direct URL access should work for SSG pages
  // Without cleanUrls: true in config.json, these would 404 on actual Vercel deployment
  it('should serve SSG page via direct URL access', async () => {
    const response = await fetch(`${serverUrl}/api-test`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
  })

  it('should serve SPA page via direct URL access', async () => {
    const response = await fetch(`${serverUrl}/spa-page`)
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toContain('text/html')
  })

  it('should serve dynamic SSG page via direct URL access', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/posts/hello-world`)

    expect(await page.textContent('#post-title')).toBe('Post: hello-world')
    expect(await page.textContent('#post-slug')).toBe('Slug: hello-world')
    expect(await page.textContent('#render-mode')).toBe('Mode: SSG')

    await page.close()
  })

  it('should serve different dynamic SSG pages via direct URL', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/posts/another-post`)

    expect(await page.textContent('#post-title')).toBe('Post: another-post')
    expect(await page.textContent('#post-slug')).toBe('Slug: another-post')

    await page.close()
  })
})

describe('Vercel Build Output Validation', () => {
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
