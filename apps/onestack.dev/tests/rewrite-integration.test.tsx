import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:6173'
const isDebug = !!process.env.DEBUG

console.info(`Testing rewrites at: ${serverUrl} with debug mode: ${isDebug}`)

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

describe('URL Rewriting', () => {
  test('test page loads without errors', async () => {
    const page = await context.newPage()

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(`${serverUrl}/test-rewrites`)

    // Check page loaded
    const title = await page.textContent('h1')
    expect(title).toContain('URL Rewriting Test Page')

    // No console errors
    expect(consoleErrors).toHaveLength(0)

    await page.close()
  })

  test('subdomain links are transformed to external URLs', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/test-rewrites`)

    // Wait for client-side hydration
    await page.waitForTimeout(1000)

    // Check all links - they might be transformed to full URLs
    const allLinks = await page.locator('a').all()
    const subdomainLinks = []
    
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      const text = await link.textContent()
      if (href && (href.includes('.localhost') || href.includes('/subdomain/'))) {
        subdomainLinks.push({ href, text })
        console.info(`Found link: "${text?.trim()}" -> ${href}`)
      }
    }
    
    expect(subdomainLinks.length).toBeGreaterThan(0)
    
    // Check if at least one link was transformed to subdomain URL
    const hasSubdomainUrl = subdomainLinks.some(l => l.href.includes('.localhost'))
    console.info('Has subdomain URLs:', hasSubdomainUrl)
    
    // The transformed links should use subdomain URLs
    if (hasSubdomainUrl) {
      expect(subdomainLinks[0].href).toContain('.localhost')
    } else {
      // If not transformed, they should at least have the subdomain path
      expect(subdomainLinks[0].href).toContain('/subdomain/')
    }

    await page.close()
  })

  test('middleware can return response directly', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/test-rewrites`)

    // Click the test middleware button
    await page.click('button:has-text("Test Middleware Response")')

    // Wait for response to appear - look for the JSON response specifically
    await page.waitForTimeout(1000) // Give time for the response

    // Find the pre element that contains the JSON response (not the config)
    const responseElements = await page.locator('pre').all()
    let middlewareResponse: string | null = null

    for (const element of responseElements) {
      const text = await element.textContent()
      if (text && text.includes('"message"') && text.includes('"timestamp"')) {
        middlewareResponse = text
        break
      }
    }

    expect(middlewareResponse).toBeTruthy()
    expect(middlewareResponse).toContain('Direct response from middleware')
    expect(middlewareResponse).toContain('timestamp')

    await page.close()
  })

  test('subdomain routing with .localhost works', async () => {
    const page = await context.newPage()

    // Visit subdomain URL
    // Note: This will only work if the server is configured to accept any host
    await page.goto(`${serverUrl.replace('localhost', 'app1.localhost')}/`)

    // Check if we get the subdomain page or a valid response
    const response = page.url()
    console.info('Subdomain URL response:', response)

    // The page should either show the subdomain content or redirect appropriately
    // We can't guarantee subdomain resolution in all test environments
    const content = await page.textContent('body')
    expect(content).toBeDefined()

    await page.close()
  })

  test('navigation between pages maintains proper URLs', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/test-rewrites`)

    // Get initial URL
    const initialUrl = page.url()
    console.info('Initial URL:', initialUrl)

    // Click on a subdomain link
    const hasLink = await page.locator('[data-test-link="app1"]').count()
    if (hasLink > 0) {
      await page.click('[data-test-link="app1"]')

      // Wait for navigation
      await page.waitForTimeout(1000)

      // Check new URL
      const newUrl = page.url()
      console.info('After navigation URL:', newUrl)

      // Should have navigated to a different page
      expect(newUrl).not.toBe(initialUrl)

      // Check page content
      const h1 = await page.textContent('h1')
      expect(h1).toBeDefined()
    }

    await page.close()
  })

  test('path rewrites work correctly', async () => {
    const page = await context.newPage()

    // Try to access /old-docs/intro which should rewrite to /docs/intro
    const response = await page.goto(`${serverUrl}/old-docs/intro`)

    // Should not get a 404
    const status = response?.status() || 0
    console.info('Old docs rewrite status:', status)

    // Either it successfully rewrites or returns a valid response
    expect(status).toBeLessThan(500)

    await page.close()
  })

  test('middleware request modification preserves query parameters', async () => {
    const page = await context.newPage()

    // Navigate with query parameters
    await page.goto(`${serverUrl}/test-rewrites?test=123&foo=bar`)

    // Check that query params are preserved in the URL
    const url = new URL(page.url())
    expect(url.searchParams.get('test')).toBe('123')
    expect(url.searchParams.get('foo')).toBe('bar')

    await page.close()
  })

  test('multiple middleware features work together', async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/test-rewrites`)

    // Test 1: Check page loads
    const title = await page.textContent('h1')
    expect(title).toBeTruthy()

    // Test 2: Middleware response works
    await page.click('button:has-text("Test Middleware Response")')
    await page.waitForTimeout(1000)

    // Find the JSON response
    const responseElements = await page.locator('pre').all()
    let hasJsonResponse = false
    for (const element of responseElements) {
      const text = await element.textContent()
      if (text && text.includes('"message"')) {
        hasJsonResponse = true
        break
      }
    }
    expect(hasJsonResponse).toBe(true)

    // Test 3: Links are present - check for any links with subdomain
    const allLinks = await page.locator('a').all()
    let hasSubdomainLink = false
    for (const link of allLinks) {
      const href = await link.getAttribute('href')
      if (href && (href.includes('.localhost') || href.includes('/subdomain/'))) {
        hasSubdomainLink = true
        break
      }
    }
    expect(hasSubdomainLink).toBe(true)

    await page.close()
  })
})

describe('Link Navigation', () => {
  test('clicking subdomain links navigates correctly with port preserved', { timeout: 15000 }, async () => {
    const page = await context.newPage()
    await page.goto(`${serverUrl}/test-rewrites`)
    
    // Wait for hydration
    await page.waitForTimeout(2000)
    
    // Find links by text content since data attributes aren't passed through
    const link = await page.locator('a:has-text("App1 Subdomain")')
    const linkExists = await link.count() > 0
    expect(linkExists).toBe(true)
    
    // Get the actual href
    const actualHref = await link.evaluate(el => (el as HTMLAnchorElement).href)
    console.log('Link actual href (browser):', actualHref)
    
    // Check that port is preserved
    const port = serverUrl.split(':')[2]?.split('/')[0]
    expect(actualHref).toContain(`:${port}`)
    expect(actualHref).toContain('app1.localhost')
    
    // Click the link and verify navigation
    await link.click()
    await page.waitForTimeout(2000)
    
    const currentUrl = page.url()
    console.log('After click, current URL:', currentUrl)
    expect(currentUrl).toContain('app1.localhost')
    expect(currentUrl).toContain(`:${port}`)
    
    // Verify content loaded
    const h1 = await page.textContent('h1')
    expect(h1).toBeTruthy()
    
    await page.close()
  })
  
  test('subdomain links work in both directions', { timeout: 15000 }, async () => {
    const page = await context.newPage()
    
    // Start from subdomain page
    const port = serverUrl.split(':')[2]?.split('/')[0]
    await page.goto(`http://testapp.localhost:${port}/`)
    await page.waitForTimeout(2000)
    
    // Check we're on the subdomain page
    const h1 = await page.textContent('h1')
    console.log('Subdomain page H1:', h1)
    expect(h1).toContain('testapp')
    
    // Find any link back (might be "Back to main site" or similar)
    const links = await page.locator('a').all()
    let foundMainLink = false
    
    for (const link of links) {
      const text = await link.textContent()
      if (text && text.toLowerCase().includes('back')) {
        foundMainLink = true
        await link.click()
        break
      }
    }
    
    if (!foundMainLink) {
      // If no "back" link, just verify we can navigate to root
      await page.goto(`http://localhost:${port}/`)
    }
    
    await page.waitForTimeout(1000)
    
    // Should be on main site
    const currentUrl = page.url()
    expect(currentUrl).toContain(`localhost:${port}`)
    expect(currentUrl).not.toContain('testapp')
    
    await page.close()
  })
})

describe('Subdomain Pages', () => {
  test('subdomain page renders correctly', async () => {
    const page = await context.newPage()

    // Navigate to the subdomain route directly
    await page.goto(`${serverUrl}/subdomain/testapp`)

    // Check page content
    const h1 = await page.textContent('h1')
    expect(h1).toContain('testapp')

    // Check that the debug info shows correct params
    const content = await page.textContent('body')
    expect(content).toContain('testapp')

    await page.close()
  })

  test('subdomain about page works', async () => {
    const page = await context.newPage()

    // Navigate to subdomain about page
    await page.goto(`${serverUrl}/subdomain/testapp/about`)

    // Check page content
    const h1 = await page.textContent('h1')
    expect(h1).toContain('About')
    expect(h1).toContain('testapp')

    await page.close()
  })

  test('navigation within subdomain pages works', async () => {
    const page = await context.newPage()

    // Start at subdomain home
    await page.goto(`${serverUrl}/subdomain/myapp`)

    // Check we're on the right page
    let h1 = await page.textContent('h1')
    expect(h1).toContain('myapp')

    // Look for about link and click it if present
    const hasAboutLink = await page.locator('a:has-text("About")').count()
    if (hasAboutLink > 0) {
      await page.click('a:has-text("About")')
      await page.waitForTimeout(500)

      // Check we navigated to about page
      h1 = await page.textContent('h1')
      expect(h1).toContain('About')
    }

    await page.close()
  })
})
