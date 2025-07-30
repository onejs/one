import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL
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

describe('Server-Client Only Module Tests', () => {
  it('server-only modules should work on the server', async () => {
    const page = await context.newPage()
    // Navigate to the server-only test page
    await page.goto(`${serverUrl}/test-server-only`)

    // Wait for the page to load
    await page.waitForSelector('text=Server Only Test Page')

    // Check that the page loaded successfully
    const heading = await page.textContent('h2')
    expect(heading).toBe('Server Only Test Page')

    // Check that server data was loaded
    const loadedDataText = await page.textContent('p:has-text("Loaded data:")')
    expect(loadedDataText).toContain('This data was loaded on the server')
    
    // Verify that the server environment info is present
    const pageContent = await page.content()
    expect(pageContent).toContain('nodeVersion')
    expect(pageContent).toContain('platform')

    await page.close()
  })

  it('client-only modules should work on the client', async () => {
    const page = await context.newPage()
    // Navigate to the client-only test page
    await page.goto(`${serverUrl}/test-client-only`)

    // Wait for the page to load
    await page.waitForSelector('text=Client Only Test Page')

    // Check that the page loaded successfully
    const heading = await page.textContent('h2')
    expect(heading).toBe('Client Only Test Page')

    // Wait for client-side hydration
    await page.waitForFunction(() => typeof window !== 'undefined')
    
    // The environment text shows 'client' after hydration
    await page.waitForSelector('p:has-text("Environment: client")', { timeout: 5000 })

    // Test client-side functionality
    const button = await page.locator('button:has-text("Increment")')
    
    // Check initial count
    let countText = await page.textContent('p:has-text("Count:")')
    expect(countText).toBe('Count: 0')

    // Click increment button
    await button.click()
    
    // Check updated count
    countText = await page.textContent('p:has-text("Count:")')
    expect(countText).toBe('Count: 1')

    // Wait for browser info to load (from dynamic import)
    await page.waitForSelector('p:has-text("Browser:")', { timeout: 5000 })
    const browserText = await page.textContent('p:has-text("Browser:")')
    expect(browserText).toContain('Browser:')

    await page.close()
  })

  it('server-only page should render server data', async () => {
    const response = await fetch(`${serverUrl}/test-server-only`)
    const html = await response.text()
    
    // Check that the page contains server-side rendered content
    expect(html).toContain('Server Only Test Page')
    expect(html).toContain('This page imports &#x27;server-only&#x27; at the top')
    expect(html).toContain('This data was loaded on the server')
  })

  it('client-only page should render as SPA', async () => {
    const response = await fetch(`${serverUrl}/test-client-only`)
    const html = await response.text()
    
    // Check that this is a SPA page
    expect(html).toContain('__vxrnIsSPA')
    expect(html).toContain('"mode":"spa"')
    // SPA pages don't render content on the server
    expect(html).not.toContain('Client Only Test Page')
    expect(html).not.toContain('userAgent')
  })
})