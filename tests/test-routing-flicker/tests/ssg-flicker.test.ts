import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * SSG Hydration Flicker Tests
 *
 * These tests verify that SSG pages don't experience content flickering during:
 * 1. Initial page load (hydration)
 * 2. Client-side navigation between pages
 *
 * Flicker = content disappearing momentarily after initial paint, then reappearing
 *
 * The tests detect flicker by:
 * - Checking content is visible immediately at DOMContentLoaded (before JS fully loads)
 * - Using MutationObserver to detect content shrinking during navigation
 * - Verifying SSG HTML is complete without JavaScript
 * - Monitoring for React hydration mismatch errors
 */

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

// SSG routes with loaders - these have +ssg suffix
const SSG_ROUTES_WITH_LOADERS = [
  { path: '/', expectedText: 'Home Page', contentId: 'page-title' },
  { path: '/docs', expectedText: 'Documentation', contentId: 'docs-title' },
  { path: '/docs/getting-started', expectedText: 'Getting Started', contentId: 'doc-title' },
  { path: '/docs/api-reference', expectedText: 'API Reference', contentId: 'doc-title' },
  { path: '/docs/advanced-usage', expectedText: 'Advanced Usage', contentId: 'doc-title' },
]

// SSG route without loader
const SSG_ROUTE_NO_LOADER = { path: '/no-loader', expectedText: 'No Loader Page', contentId: 'no-loader-title' }

// Default mode routes (using defaultRenderMode from config, which is 'spa' in test)
const DEFAULT_MODE_ROUTES = [
  { path: '/default-mode', expectedText: 'Default Mode Index', contentId: 'default-title' },
  { path: '/default-mode/page-one', expectedText: 'Page One', contentId: 'default-slug-title' },
  { path: '/default-mode/page-two', expectedText: 'Page Two', contentId: 'default-slug-title' },
  { path: '/default-mode/page-three', expectedText: 'Page Three', contentId: 'default-slug-title' },
]

// Helper to set up flicker detection via MutationObserver
async function setupFlickerDetection(page: Page, minContentLength = 50) {
  await page.evaluate((minLen) => {
    ;(window as any).__flickerDetected = false
    ;(window as any).__flickerDetails = []
    ;(window as any).__minContentBeforeFlicker = Infinity

    const checkFlicker = () => {
      const container = document.querySelector('#app-container')
      if (container && container.textContent) {
        const len = container.textContent.trim().length
        ;(window as any).__minContentBeforeFlicker = Math.min((window as any).__minContentBeforeFlicker, len)

        if (len < minLen) {
          ;(window as any).__flickerDetected = true
          ;(window as any).__flickerDetails.push({
            timestamp: Date.now(),
            contentLength: len,
            content: container.textContent.trim().substring(0, 100),
          })
        }
      }
    }

    const observer = new MutationObserver(checkFlicker)
    observer.observe(document.body, { childList: true, subtree: true, characterData: true })
    ;(window as any).__flickerObserver = observer
  }, minContentLength)
}

async function getFlickerResults(page: Page) {
  return page.evaluate(() => ({
    flickerDetected: (window as any).__flickerDetected,
    flickerDetails: (window as any).__flickerDetails,
    minContentLength: (window as any).__minContentBeforeFlicker,
  }))
}

// ============================================================================
// SECTION 1: SSG Hydration - Content Present at DOM Ready
// ============================================================================

describe('SSG Hydration - No Flicker on Initial Load', () => {
  for (const route of SSG_ROUTES_WITH_LOADERS) {
    test(`${route.path} has content immediately at DOM ready`, async () => {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(serverUrl + route.path, { waitUntil: 'domcontentloaded' })

      const html = await page.content()
      const hasExpectedContent = html.includes(route.expectedText)
      const hasAppContainer = html.includes('id="app-container"')
      const hasSubstantialContent = html.length > 1000

      const contentElement = await page.$(`#${route.contentId}`)
      const contentText = contentElement ? await contentElement.textContent() : null

      expect(hasExpectedContent, `Expected "${route.expectedText}" in HTML at DOM ready for ${route.path}`).toBe(true)
      expect(hasAppContainer, `Expected app-container in HTML for ${route.path}`).toBe(true)
      expect(hasSubstantialContent, `Expected substantial HTML content for ${route.path}`).toBe(true)
      expect(contentText, `Expected #${route.contentId} to exist for ${route.path}`).toContain(route.expectedText)
      expect(errors, `Page ${route.path} should not have JS errors`).toHaveLength(0)

      await page.close()
    })
  }

  test('SSG page without loader has content at DOM ready', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto(serverUrl + SSG_ROUTE_NO_LOADER.path, { waitUntil: 'domcontentloaded' })

    const html = await page.content()
    expect(html).toContain(SSG_ROUTE_NO_LOADER.expectedText)
    expect(errors).toHaveLength(0)

    await page.close()
  })
})

// ============================================================================
// SECTION 2: SSG Navigation Between Dynamic Routes - No Flicker
// ============================================================================

describe('SSG Navigation - Dynamic Route to Dynamic Route', () => {
  test('/docs/getting-started => /docs/api-reference - no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    expect(await page.textContent('#doc-title')).toContain('Getting Started')

    await setupFlickerDetection(page)

    await page.click('a[href="/docs/api-reference"]')
    await page.waitForURL('**/docs/api-reference')
    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    const finalContent = await page.textContent('#doc-title')

    expect(finalContent).toContain('API Reference')
    expect(results.flickerDetected, `Flicker detected! Min content: ${results.minContentLength}`).toBe(false)

    await page.close()
  })

  test('/docs/getting-started => /docs/api-reference => /docs/advanced-usage - chain navigation no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    expect(await page.textContent('#doc-title')).toContain('Getting Started')

    await setupFlickerDetection(page)

    await page.click('a[href="/docs/api-reference"]')
    await page.waitForURL('**/docs/api-reference')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#doc-title')).toContain('API Reference')

    await page.click('a[href="/docs/advanced-usage"]')
    await page.waitForURL('**/docs/advanced-usage')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#doc-title')).toContain('Advanced Usage')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected, `Flicker during chain navigation! Details: ${JSON.stringify(results.flickerDetails)}`).toBe(
      false
    )

    await page.close()
  })
})

describe('SSG Navigation - Index to Dynamic Route', () => {
  test('/docs => /docs/getting-started - index to dynamic no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs', { waitUntil: 'networkidle' })
    expect(await page.textContent('#docs-title')).toContain('Documentation')

    await setupFlickerDetection(page)

    await page.click('a[href="/docs/getting-started"]')
    await page.waitForURL('**/docs/getting-started')
    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(await page.textContent('#doc-title')).toContain('Getting Started')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })

  test('/ => /docs/getting-started - home to docs dynamic no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    expect(await page.textContent('#page-title')).toContain('Home Page')

    await setupFlickerDetection(page)

    await page.click('a[href="/docs/getting-started"]')
    await page.waitForURL('**/docs/getting-started')
    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(await page.textContent('#doc-title')).toContain('Getting Started')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })
})

describe('SSG Navigation - Dynamic Route Back to Index', () => {
  test('/docs/getting-started => /docs - dynamic to index no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    await page.waitForSelector('#doc-title', { state: 'visible' })
    expect(await page.textContent('#doc-title')).toContain('Getting Started')

    await setupFlickerDetection(page)

    // Use ID selector for more reliable targeting, and wait for it to be visible
    await page.waitForSelector('#nav-to-docs-index', { state: 'visible' })
    await page.click('#nav-to-docs-index')
    await page.waitForURL('**/docs', { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#docs-title', { state: 'visible', timeout: 10000 })

    const results = await getFlickerResults(page)
    expect(await page.textContent('#docs-title')).toContain('Documentation')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 3: Default Mode Navigation (SPA mode in test config)
// ============================================================================

describe('Default Mode Navigation - Dynamic Routes', () => {
  test('/default-mode/page-one => /default-mode/page-two - no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode/page-one', { waitUntil: 'networkidle' })
    await page.waitForSelector('#default-slug-title')
    expect(await page.textContent('#default-slug-title')).toContain('Page One')

    await setupFlickerDetection(page)

    await page.click('#nav-to-default-page-two')
    await page.waitForURL('**/default-mode/page-two')
    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(await page.textContent('#default-slug-title')).toContain('Page Two')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })

  test('/default-mode => /default-mode/page-one - index to dynamic no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode', { waitUntil: 'networkidle' })
    await page.waitForSelector('#default-title')
    expect(await page.textContent('#default-title')).toContain('Default Mode Index')

    await setupFlickerDetection(page)

    await page.click('#nav-to-default-page-one')
    await page.waitForURL('**/default-mode/page-one')
    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(await page.textContent('#default-slug-title')).toContain('Page One')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })

  test('/default-mode/page-one => page-two => page-three - chain navigation no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode/page-one', { waitUntil: 'networkidle' })
    await page.waitForSelector('#default-slug-title')
    expect(await page.textContent('#default-slug-title')).toContain('Page One')

    await setupFlickerDetection(page)

    await page.click('#nav-to-default-page-two')
    await page.waitForURL('**/default-mode/page-two')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#default-slug-title')).toContain('Page Two')

    await page.click('#nav-to-default-page-three')
    await page.waitForURL('**/default-mode/page-three')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#default-slug-title')).toContain('Page Three')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 4: Cross-Mode Navigation (SSG <=> Default Mode)
// ============================================================================

describe('Cross-Mode Navigation - SSG to Default Mode', () => {
  test.skip('/docs/getting-started => /default-mode/page-one - SSG to default mode no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    expect(await page.textContent('#doc-title')).toContain('Getting Started')

    await setupFlickerDetection(page)

    await page.click('#link-default-mode')
    await page.waitForURL('**/default-mode')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#default-title')

    const results = await getFlickerResults(page)
    expect(await page.textContent('#default-title')).toContain('Default Mode Index')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })

  test('/default-mode/page-one => /docs/getting-started - default mode to SSG no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode/page-one', { waitUntil: 'networkidle' })
    await page.waitForSelector('#default-slug-title')
    expect(await page.textContent('#default-slug-title')).toContain('Page One')

    await setupFlickerDetection(page)

    await page.click('#nav-to-docs-getting-started')
    await page.waitForURL('**/docs/getting-started')
    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(await page.textContent('#doc-title')).toContain('Getting Started')
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })

  test.skip('/ => /default-mode => /docs => / - full circuit no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    expect(await page.textContent('#page-title')).toContain('Home Page')

    await setupFlickerDetection(page)

    // Home -> Default Mode
    await page.click('#link-default-mode')
    await page.waitForURL('**/default-mode')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#default-title')
    expect(await page.textContent('#default-title')).toContain('Default Mode Index')

    // Default Mode -> Docs
    await page.click('#nav-to-docs-index')
    await page.waitForURL('**/docs')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#docs-title')).toContain('Documentation')

    // Docs -> Home
    await page.click('#link-home')
    await page.waitForURL(serverUrl + '/')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#page-title')).toContain('Home Page')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected, `Flicker in full circuit! Details: ${JSON.stringify(results.flickerDetails)}`).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 5: Loader to Non-Loader Navigation
// ============================================================================

describe('Navigation - Loader to Non-Loader Pages', () => {
  test('/docs/getting-started => /no-loader => /docs/api-reference - loader to non-loader to loader', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    expect(await page.textContent('#doc-title')).toContain('Getting Started')

    await setupFlickerDetection(page)

    // Use correct selector: nav-to-no-loader (not link-no-loader)
    await page.click('#nav-to-no-loader')
    await page.waitForURL('**/no-loader')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#no-loader-title')).toContain('No Loader Page')

    // Use correct selector: nav-to-docs-getting-started
    await page.click('#nav-to-docs-getting-started')
    await page.waitForURL('**/docs/getting-started')
    await page.waitForLoadState('networkidle')
    expect(await page.textContent('#doc-title')).toContain('Getting Started')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 6: Browser Back/Forward Navigation
// ============================================================================

describe('Browser History Navigation (Back/Forward)', () => {
  // TODO: goForward doesn't work - URL changes but UI doesn't update
  // Investigation ongoing in docs/SSG_HYDRATION_FIX.md
  test.skip('back/forward between SSG dynamic routes preserves content without flicker', async () => {
    const page = await context.newPage()

    // Enable console logging from the page
    page.on('console', msg => {
      if (msg.type() === 'log' || msg.type() === 'info') {
        console.log(`[PAGE] ${msg.text()}`)
      }
    })

    console.log('[TEST] Starting at /docs/getting-started')
    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    const title1 = await page.textContent('#doc-title')
    console.log(`[TEST] Title after goto: "${title1}"`)
    expect(title1).toContain('Getting Started')

    console.log('[TEST] Clicking to /docs/api-reference')
    await page.click('a[href="/docs/api-reference"]')
    await page.waitForURL('**/docs/api-reference')
    await page.waitForLoadState('networkidle')
    const title2 = await page.textContent('#doc-title')
    console.log(`[TEST] Title after nav to api-reference: "${title2}"`)
    expect(title2).toContain('API Reference')

    console.log('[TEST] Clicking to /docs/advanced-usage')
    await page.click('a[href="/docs/advanced-usage"]')
    await page.waitForURL('**/docs/advanced-usage')
    await page.waitForLoadState('networkidle')
    const title3 = await page.textContent('#doc-title')
    console.log(`[TEST] Title after nav to advanced-usage: "${title3}"`)
    expect(title3).toContain('Advanced Usage')

    await setupFlickerDetection(page)

    console.log('[TEST] Going back (should be api-reference)')
    await page.goBack()
    await page.waitForURL('**/docs/api-reference')
    await page.waitForLoadState('networkidle')
    await new Promise((res) => setTimeout(res, 1000))
    const title4 = await page.textContent('#doc-title')
    console.log(`[TEST] Title after goBack #1: "${title4}"`)
    expect(title4).toContain('API Reference')

    console.log('[TEST] Going back again (should be getting-started)')
    await page.goBack()
    await page.waitForURL('**/docs/getting-started')
    await page.waitForLoadState('networkidle')
    await new Promise((res) => setTimeout(res, 1000))
    const title5 = await page.textContent('#doc-title')
    console.log(`[TEST] Title after goBack #2: "${title5}"`)
    expect(title5).toContain('Getting Started')

    console.log('[TEST] Going forward (should be api-reference)')
    await page.goForward()
    await page.waitForURL('**/docs/api-reference')
    await page.waitForLoadState('networkidle')
    await new Promise((res) => setTimeout(res, 1000))
    const title6 = await page.textContent('#doc-title')
    console.log(`[TEST] Title after goForward: "${title6}"`)
    expect(title6).toContain('API Reference')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected, `Flicker during back/forward! Details: ${JSON.stringify(results.flickerDetails)}`).toBe(false)

    await page.close()
  })

  test('back/forward between default mode pages no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode/page-one', { waitUntil: 'networkidle' })
    await page.waitForSelector('#default-slug-title')

    await page.click('#nav-to-default-page-two')
    await page.waitForURL('**/default-mode/page-two')
    await page.waitForLoadState('networkidle')

    await page.click('#nav-to-default-page-three')
    await page.waitForURL('**/default-mode/page-three')
    await page.waitForLoadState('networkidle')

    await setupFlickerDetection(page)

    await page.goBack()
    await page.waitForURL('**/default-mode/page-two')
    await new Promise((res) => setTimeout(res, 500))
    expect(await page.textContent('#default-slug-title')).toContain('Page Two')

    await page.goBack()
    await page.waitForURL('**/default-mode/page-one')
    await new Promise((res) => setTimeout(res, 500))
    expect(await page.textContent('#default-slug-title')).toContain('Page One')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })

  test.skip('back/forward across SSG and default mode pages no flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await page.click('#link-docs')
    await page.waitForURL('**/docs')
    await page.waitForLoadState('networkidle')

    await page.click('#link-default-mode')
    await page.waitForURL('**/default-mode')
    await page.waitForLoadState('networkidle')
    await page.waitForSelector('#default-title')

    await setupFlickerDetection(page)

    await page.goBack()
    await page.waitForURL('**/docs')
    await new Promise((res) => setTimeout(res, 500))
    expect(await page.textContent('#docs-title')).toContain('Documentation')

    await page.goBack()
    await page.waitForURL(serverUrl + '/')
    await new Promise((res) => setTimeout(res, 500))
    expect(await page.textContent('#page-title')).toContain('Home Page')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 7: SSG Content Without JavaScript
// ============================================================================

describe('SSG Content Without JavaScript', () => {
  for (const route of [...SSG_ROUTES_WITH_LOADERS, SSG_ROUTE_NO_LOADER]) {
    test(`${route.path} has full content with JS disabled`, async () => {
      const noJsContext = await browser.newContext({ javaScriptEnabled: false })
      const page = await noJsContext.newPage()

      await page.goto(serverUrl + route.path, { waitUntil: 'domcontentloaded' })

      const html = await page.content()
      const hasExpectedContent = html.includes(route.expectedText)
      const hasAppContainer = html.includes('id="app-container"')

      expect(hasExpectedContent, `SSG page ${route.path} should have "${route.expectedText}" without JS`).toBe(true)
      expect(hasAppContainer, `SSG page ${route.path} should have app-container without JS`).toBe(true)

      await noJsContext.close()
    })
  }
})

// ============================================================================
// SECTION 8: Hydration Console Errors
// ============================================================================

describe('Hydration Console Errors', () => {
  const routesToCheck = [
    '/docs/getting-started',
    '/docs/api-reference',
    '/',
    '/docs',
  ]

  for (const path of routesToCheck) {
    test(`${path} has no hydration mismatch warnings`, async () => {
      const page = await context.newPage()
      const consoleMessages: { type: string; text: string }[] = []

      page.on('console', (msg) => {
        consoleMessages.push({ type: msg.type(), text: msg.text() })
      })

      await page.goto(serverUrl + path, { waitUntil: 'networkidle' })
      await new Promise((res) => setTimeout(res, 1000))

      const hydrationErrors = consoleMessages.filter(
        (msg) =>
          msg.type === 'error' &&
          (msg.text.toLowerCase().includes('hydration') ||
            msg.text.includes('did not match') ||
            msg.text.includes('content does not match') ||
            msg.text.includes('Text content does not match') ||
            msg.text.includes('Hydration failed'))
      )

      const destructureErrors = consoleMessages.filter(
        (msg) =>
          msg.type === 'error' &&
          (msg.text.includes('Cannot destructure') || msg.text.includes('Cannot read properties of null'))
      )

      expect(hydrationErrors, `Hydration errors on ${path}: ${JSON.stringify(hydrationErrors)}`).toHaveLength(0)
      expect(destructureErrors, `Destructure errors on ${path}: ${JSON.stringify(destructureErrors)}`).toHaveLength(0)

      await page.close()
    })
  }
})

// ============================================================================
// SECTION 9: Rapid Navigation Stress Test
// ============================================================================

describe.skip('Rapid Navigation Stress Test', () => {
  test('rapid clicks between SSG pages does not cause flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs', { waitUntil: 'networkidle' })
    await setupFlickerDetection(page, 30)

    const links = [
      'a[href="/docs/getting-started"]',
      'a[href="/docs/api-reference"]',
      'a[href="/docs/advanced-usage"]',
    ]

    for (let i = 0; i < 3; i++) {
      for (const link of links) {
        const element = await page.$(link)
        if (element) {
          await element.click()
          await new Promise((res) => setTimeout(res, 200))
        }
      }
    }

    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected, `Flicker during rapid nav! Min content: ${results.minContentLength}`).toBe(false)

    await page.close()
  })

  test('rapid clicks between default mode pages does not cause flicker', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode', { waitUntil: 'networkidle' })
    await page.waitForSelector('#default-title')
    await setupFlickerDetection(page, 30)

    const links = [
      '#nav-to-default-page-one',
      '#nav-to-default-page-two',
      '#nav-to-default-page-three',
    ]

    for (let i = 0; i < 3; i++) {
      for (const link of links) {
        const element = await page.$(link)
        if (element) {
          await element.click()
          await new Promise((res) => setTimeout(res, 300))
        }
      }
    }

    await page.waitForLoadState('networkidle')

    const results = await getFlickerResults(page)
    expect(results.flickerDetected, `Flicker during rapid nav! Min content: ${results.minContentLength}`).toBe(false)

    await page.close()
  })
})
