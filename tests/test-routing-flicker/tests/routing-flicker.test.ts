import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Routing Flicker Tests
 *
 * These tests verify that pages don't experience content flickering during:
 * 1. Initial page load (hydration for SSG/SSR, or client load for SPA)
 * 2. Client-side navigation between pages
 *
 * Flicker = content disappearing momentarily after initial paint, then reappearing
 *
 * The tests work regardless of the DEFAULT_RENDER_MODE (spa, ssg, ssr)
 * because they test the behavior that should be consistent across all modes:
 * - Content should load without flickering
 * - Navigation should be smooth without content disappearing
 *
 * Pages are organized into:
 * - SSG pages: Always use +ssg suffix (/, /docs, /docs/[slug], /no-loader)
 * - Default mode pages: No suffix, use defaultRenderMode (/default-mode, /default-mode/[slug])
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

// ============================================================================
// PAGE DEFINITIONS
// ============================================================================

// SSG pages (always +ssg suffix)
const SSG_PAGES = {
  home: { path: '/', titleId: 'page-title', expectedTitle: 'Home Page' },
  docsIndex: { path: '/docs', titleId: 'docs-title', expectedTitle: 'Documentation' },
  docsGettingStarted: {
    path: '/docs/getting-started',
    titleId: 'doc-title',
    expectedTitle: 'Getting Started',
  },
  docsApiReference: {
    path: '/docs/api-reference',
    titleId: 'doc-title',
    expectedTitle: 'API Reference',
  },
  docsAdvancedUsage: {
    path: '/docs/advanced-usage',
    titleId: 'doc-title',
    expectedTitle: 'Advanced Usage',
  },
  noLoader: {
    path: '/no-loader',
    titleId: 'no-loader-title',
    expectedTitle: 'No Loader Page',
  },
}

// Default mode pages (no suffix, uses defaultRenderMode)
const DEFAULT_MODE_PAGES = {
  index: {
    path: '/default-mode',
    titleId: 'default-title',
    expectedTitle: 'Default Mode Index',
  },
  pageOne: {
    path: '/default-mode/page-one',
    titleId: 'default-slug-title',
    expectedTitle: 'Page One',
  },
  pageTwo: {
    path: '/default-mode/page-two',
    titleId: 'default-slug-title',
    expectedTitle: 'Page Two',
  },
  pageThree: {
    path: '/default-mode/page-three',
    titleId: 'default-slug-title',
    expectedTitle: 'Page Three',
  },
}

// ============================================================================
// FLICKER DETECTION HELPERS
// ============================================================================

/**
 * Sets up a MutationObserver to detect content flickering.
 * Flicker is detected when the app container's text content drops below a threshold.
 */
async function setupFlickerDetection(page: Page, minContentLength = 50) {
  await page.evaluate((minLen) => {
    ;(window as any).__flickerDetected = false
    ;(window as any).__flickerEvents = []
    ;(window as any).__minContentSeen = Infinity

    const checkForFlicker = () => {
      const container = document.querySelector('#app-container')
      if (container && container.textContent) {
        const contentLength = container.textContent.trim().length
        ;(window as any).__minContentSeen = Math.min(
          (window as any).__minContentSeen,
          contentLength
        )

        if (contentLength < minLen) {
          ;(window as any).__flickerDetected = true
          ;(window as any).__flickerEvents.push({
            timestamp: Date.now(),
            contentLength,
            snippet: container.textContent.trim().substring(0, 100),
          })
        }
      }
    }

    const observer = new MutationObserver(checkForFlicker)
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })
    ;(window as any).__flickerObserver = observer
  }, minContentLength)
}

/**
 * Gets the flicker detection results.
 */
async function getFlickerResults(page: Page) {
  return page.evaluate(() => ({
    flickerDetected: (window as any).__flickerDetected,
    flickerEvents: (window as any).__flickerEvents,
    minContentSeen: (window as any).__minContentSeen,
  }))
}

/**
 * Waits for a page to be "ready" - content is loaded and stable.
 */
async function waitForPageReady(
  page: Page,
  titleId: string,
  expectedTitle: string,
  timeout = 10000
) {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const titleElement = await page.$(`#${titleId}`)
      if (titleElement) {
        const text = await titleElement.textContent()
        if (text && text.includes(expectedTitle)) {
          return true
        }
      }
    } catch {
      // Element not found yet
    }
    await new Promise((res) => setTimeout(res, 100))
  }
  return false
}

/**
 * Waits for a link to appear in the DOM and be visible/clickable
 */
async function waitForLink(
  page: Page,
  linkId: string,
  timeout = 15000
): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const link = await page.$(`#${linkId}`)
      if (link) {
        // Also check that the element is visible
        const isVisible = await link.isVisible()
        if (isVisible) {
          return true
        }
      }
    } catch {
      // Element not found yet
    }
    await new Promise((res) => setTimeout(res, 100))
  }
  return false
}

/**
 * Navigates via clicking a link and waits for the new page.
 */
async function navigateViaLink(
  page: Page,
  linkId: string,
  targetTitleId: string,
  expectedTitle: string
): Promise<boolean> {
  // Wait for the link to appear first (important for dev mode where compilation happens)
  const linkFound = await waitForLink(page, linkId)
  if (!linkFound) {
    // Debug: get current page content to see what's available
    const currentUrl = page.url()
    const bodyText = await page.evaluate(
      () => document.body?.textContent?.substring(0, 500) || 'no body'
    )
    throw new Error(
      `Link #${linkId} not found after waiting. Current URL: ${currentUrl}. Body preview: ${bodyText}`
    )
  }

  // Use page.click with selector instead of storing ElementHandle to avoid "element detached" errors
  // during rapid navigation where React may re-render the element
  await page.click(`#${linkId}`)
  return waitForPageReady(page, targetTitleId, expectedTitle)
}

// ============================================================================
// SECTION 1: Initial Page Load Tests
// ============================================================================

describe('Initial Page Load - SSG Pages', () => {
  Object.entries(SSG_PAGES).forEach(([name, pageInfo]) => {
    test(`${name} (${pageInfo.path}) loads with content`, async () => {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(serverUrl + pageInfo.path, { waitUntil: 'networkidle' })

      const ready = await waitForPageReady(page, pageInfo.titleId, pageInfo.expectedTitle)
      expect(
        ready,
        `Page ${pageInfo.path} should load with title "${pageInfo.expectedTitle}"`
      ).toBe(true)

      const title = await page.$(`#${pageInfo.titleId}`)
      const titleText = await title?.textContent()
      expect(titleText).toContain(pageInfo.expectedTitle)

      expect(errors, `Page ${pageInfo.path} should not have JS errors`).toHaveLength(0)

      await page.close()
    })
  })
})

describe('Initial Page Load - Default Mode Pages', () => {
  Object.entries(DEFAULT_MODE_PAGES).forEach(([name, pageInfo]) => {
    test(`${name} (${pageInfo.path}) loads with content`, async () => {
      const page = await context.newPage()
      const errors: string[] = []
      page.on('pageerror', (err) => errors.push(err.message))

      await page.goto(serverUrl + pageInfo.path, { waitUntil: 'networkidle' })

      const ready = await waitForPageReady(page, pageInfo.titleId, pageInfo.expectedTitle)
      expect(
        ready,
        `Page ${pageInfo.path} should load with title "${pageInfo.expectedTitle}"`
      ).toBe(true)

      const title = await page.$(`#${pageInfo.titleId}`)
      const titleText = await title?.textContent()
      expect(titleText).toContain(pageInfo.expectedTitle)

      expect(errors, `Page ${pageInfo.path} should not have JS errors`).toHaveLength(0)

      await page.close()
    })
  })
})

// ============================================================================
// SECTION 2: SSG Page Navigation (within SSG pages)
// ============================================================================

describe('SSG Page Navigation - No Flicker', () => {
  test('Home -> Docs Index -> Getting Started -> API Reference', async () => {
    const page = await context.newPage()

    // Start at home
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    await setupFlickerDetection(page)

    // Home -> Docs Index
    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')

    // Docs Index -> Getting Started
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      'doc-title',
      'Getting Started'
    )

    // Getting Started -> API Reference
    await navigateViaLink(page, 'nav-to-docs-api-reference', 'doc-title', 'API Reference')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Docs Getting Started -> API Reference -> Advanced Usage (between dynamic routes)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'doc-title', 'Getting Started')

    await setupFlickerDetection(page)

    // Getting Started -> API Reference
    await navigateViaLink(page, 'nav-to-docs-api-reference', 'doc-title', 'API Reference')

    // API Reference -> Advanced Usage
    await navigateViaLink(
      page,
      'nav-to-docs-advanced-usage',
      'doc-title',
      'Advanced Usage'
    )

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Dynamic route -> Index -> Home -> Dynamic route (round trip)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/api-reference', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'doc-title', 'API Reference')

    await setupFlickerDetection(page)

    // API Reference -> Docs Index
    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')

    // Docs Index -> Home
    await navigateViaLink(page, 'nav-to-home', 'page-title', 'Home Page')

    // Home -> Getting Started
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      'doc-title',
      'Getting Started'
    )

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('SSG page with loader -> No Loader page -> SSG page with loader', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'doc-title', 'Getting Started')

    await setupFlickerDetection(page)

    // Getting Started -> No Loader
    await navigateViaLink(page, 'nav-to-no-loader', 'no-loader-title', 'No Loader Page')

    // No Loader -> Docs Index
    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')

    // Docs Index -> API Reference
    await navigateViaLink(page, 'nav-to-docs-api-reference', 'doc-title', 'API Reference')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 3: Default Mode Page Navigation (within default mode pages)
// ============================================================================

describe('Default Mode Page Navigation - No Flicker', () => {
  test('Default Index -> Page One -> Page Two -> Page Three', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'default-title', 'Default Mode Index')

    await setupFlickerDetection(page)

    // Index -> Page One
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )

    // Page One -> Page Two
    await navigateViaLink(
      page,
      'nav-to-default-page-two',
      'default-slug-title',
      'Page Two'
    )

    // Page Two -> Page Three
    await navigateViaLink(
      page,
      'nav-to-default-page-three',
      'default-slug-title',
      'Page Three'
    )

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Page One -> Page Three -> Page Two -> Index (back and forth)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode/page-one', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'default-slug-title', 'Page One')

    await setupFlickerDetection(page)

    // Page One -> Page Three
    await navigateViaLink(
      page,
      'nav-to-default-page-three',
      'default-slug-title',
      'Page Three'
    )

    // Page Three -> Page Two
    await navigateViaLink(
      page,
      'nav-to-default-page-two',
      'default-slug-title',
      'Page Two'
    )

    // Page Two -> Index
    await navigateViaLink(
      page,
      'nav-to-default-index',
      'default-title',
      'Default Mode Index'
    )

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 4: Cross-Mode Navigation (SSG <-> Default Mode)
// ============================================================================

describe('Cross-Mode Navigation - SSG to Default Mode', () => {
  test('Home (SSG) -> Default Mode Index -> Page One -> Home (SSG)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    await setupFlickerDetection(page)

    // Home -> Default Mode Index
    await navigateViaLink(
      page,
      'nav-to-default-index',
      'default-title',
      'Default Mode Index'
    )

    // Default Mode Index -> Page One
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )

    // Page One -> Home
    await navigateViaLink(page, 'nav-to-home', 'page-title', 'Home Page')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Docs Getting Started (SSG) -> Default Page One -> Docs API Reference (SSG)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'doc-title', 'Getting Started')

    await setupFlickerDetection(page)

    // Getting Started -> Default Page One
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )

    // Default Page One -> API Reference
    await navigateViaLink(page, 'nav-to-docs-api-reference', 'doc-title', 'API Reference')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Default Page Two -> No Loader (SSG) -> Default Page Three', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode/page-two', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'default-slug-title', 'Page Two')

    await setupFlickerDetection(page)

    // Page Two -> No Loader
    await navigateViaLink(page, 'nav-to-no-loader', 'no-loader-title', 'No Loader Page')

    // No Loader -> Default Page One
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Full circuit: SSG -> Default -> SSG -> Default -> SSG', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    await setupFlickerDetection(page)

    // 1. Home (SSG) -> Default Index
    await navigateViaLink(
      page,
      'nav-to-default-index',
      'default-title',
      'Default Mode Index'
    )

    // 2. Default Index -> Docs Index (SSG)
    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')

    // 3. Docs Index (SSG) -> Default Page Two
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )

    // 4. Default Page One -> Getting Started (SSG)
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      'doc-title',
      'Getting Started'
    )

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 5: Browser Back/Forward Navigation
// ============================================================================

describe('Browser History Navigation - No Flicker', () => {
  test('Navigate forward then back through SSG pages', async () => {
    const page = await context.newPage()

    // Build history: Home -> Docs -> Getting Started -> API Reference
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      'doc-title',
      'Getting Started'
    )
    await navigateViaLink(page, 'nav-to-docs-api-reference', 'doc-title', 'API Reference')

    await setupFlickerDetection(page)

    // Go back: API Reference -> Getting Started
    await page.goBack()
    await waitForPageReady(page, 'doc-title', 'Getting Started')

    // Go back: Getting Started -> Docs Index
    await page.goBack()
    await waitForPageReady(page, 'docs-title', 'Documentation')

    // Go forward: Docs Index -> Getting Started
    await page.goForward()
    await waitForPageReady(page, 'doc-title', 'Getting Started')

    // Go forward: Getting Started -> API Reference
    await page.goForward()
    await waitForPageReady(page, 'doc-title', 'API Reference')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Navigate forward then back through Default Mode pages', async () => {
    const page = await context.newPage()

    // Build history: Index -> Page One -> Page Two -> Page Three
    await page.goto(serverUrl + '/default-mode', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'default-title', 'Default Mode Index')

    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )
    await navigateViaLink(
      page,
      'nav-to-default-page-two',
      'default-slug-title',
      'Page Two'
    )
    await navigateViaLink(
      page,
      'nav-to-default-page-three',
      'default-slug-title',
      'Page Three'
    )

    await setupFlickerDetection(page)

    // Go back through all pages
    await page.goBack()
    await waitForPageReady(page, 'default-slug-title', 'Page Two')

    await page.goBack()
    await waitForPageReady(page, 'default-slug-title', 'Page One')

    await page.goBack()
    await waitForPageReady(page, 'default-title', 'Default Mode Index')

    // Go forward to Page One
    await page.goForward()
    await waitForPageReady(page, 'default-slug-title', 'Page One')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('Navigate back/forward across SSG and Default Mode pages', async () => {
    const page = await context.newPage()

    // Build history: Home (SSG) -> Default Index -> Docs (SSG) -> Default Page One
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    await navigateViaLink(
      page,
      'nav-to-default-index',
      'default-title',
      'Default Mode Index'
    )
    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )

    await setupFlickerDetection(page)

    // Go back: Page One -> Docs
    await page.goBack()
    await waitForPageReady(page, 'docs-title', 'Documentation')

    // Go back: Docs -> Default Index
    await page.goBack()
    await waitForPageReady(page, 'default-title', 'Default Mode Index')

    // Go forward: Default Index -> Docs
    await page.goForward()
    await waitForPageReady(page, 'docs-title', 'Documentation')

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker detected! Events: ${JSON.stringify(results.flickerEvents)}`
    ).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 6: Rapid Navigation Stress Tests
// ============================================================================

describe('Rapid Navigation Stress Tests', () => {
  test('Rapid navigation between SSG dynamic routes', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'docs-title', 'Documentation')

    await setupFlickerDetection(page, 30) // Lower threshold for stress test

    // Rapidly navigate between doc pages
    for (let i = 0; i < 3; i++) {
      await navigateViaLink(
        page,
        'nav-to-docs-getting-started',
        'doc-title',
        'Getting Started'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-docs-api-reference',
        'doc-title',
        'API Reference'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-docs-advanced-usage',
        'doc-title',
        'Advanced Usage'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')
      await new Promise((res) => setTimeout(res, 100))
    }

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker in rapid SSG nav! Min content: ${results.minContentSeen}`
    ).toBe(false)

    await page.close()
  })

  test('Rapid navigation between Default Mode dynamic routes', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/default-mode', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'default-title', 'Default Mode Index')

    await setupFlickerDetection(page, 30)

    // Rapidly navigate between pages
    for (let i = 0; i < 3; i++) {
      await navigateViaLink(
        page,
        'nav-to-default-page-one',
        'default-slug-title',
        'Page One'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-default-page-two',
        'default-slug-title',
        'Page Two'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-default-page-three',
        'default-slug-title',
        'Page Three'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-default-index',
        'default-title',
        'Default Mode Index'
      )
      await new Promise((res) => setTimeout(res, 100))
    }

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker in rapid default mode nav! Min content: ${results.minContentSeen}`
    ).toBe(false)

    await page.close()
  })

  test.skip('Rapid cross-mode navigation', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    await setupFlickerDetection(page, 30)

    // Rapidly alternate between SSG and Default Mode
    for (let i = 0; i < 2; i++) {
      await navigateViaLink(
        page,
        'nav-to-default-page-one',
        'default-slug-title',
        'Page One'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-docs-getting-started',
        'doc-title',
        'Getting Started'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-default-page-two',
        'default-slug-title',
        'Page Two'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(
        page,
        'nav-to-docs-api-reference',
        'doc-title',
        'API Reference'
      )
      await new Promise((res) => setTimeout(res, 100))

      await navigateViaLink(page, 'nav-to-home', 'page-title', 'Home Page')
      await new Promise((res) => setTimeout(res, 100))
    }

    const results = await getFlickerResults(page)
    expect(
      results.flickerDetected,
      `Flicker in rapid cross-mode nav! Min content: ${results.minContentSeen}`
    ).toBe(false)

    await page.close()
  })
})

// ============================================================================
// SECTION 7: Console Error Checks
// ============================================================================

describe('Console Error Checks', () => {
  const pagesToCheck = [
    { path: '/', name: 'Home' },
    { path: '/docs/getting-started', name: 'Docs Getting Started' },
    { path: '/default-mode/page-one', name: 'Default Mode Page One' },
  ]

  for (const { path, name } of pagesToCheck) {
    test(`${name} (${path}) has no hydration/destructure errors`, async () => {
      const page = await context.newPage()
      const consoleMessages: { type: string; text: string }[] = []

      page.on('console', (msg) => {
        consoleMessages.push({ type: msg.type(), text: msg.text() })
      })

      await page.goto(serverUrl + path, { waitUntil: 'networkidle' })

      // Wait for any delayed errors
      await new Promise((res) => setTimeout(res, 1000))

      const hydrationErrors = consoleMessages.filter(
        (msg) =>
          msg.type === 'error' &&
          (msg.text.toLowerCase().includes('hydration') ||
            msg.text.includes('did not match') ||
            msg.text.includes('content does not match') ||
            msg.text.includes('Text content does not match'))
      )

      const destructureErrors = consoleMessages.filter(
        (msg) =>
          msg.type === 'error' &&
          (msg.text.includes('Cannot destructure') ||
            msg.text.includes('Cannot read properties of null') ||
            msg.text.includes('Cannot read properties of undefined'))
      )

      expect(
        hydrationErrors,
        `Hydration errors on ${path}: ${JSON.stringify(hydrationErrors)}`
      ).toHaveLength(0)
      expect(
        destructureErrors,
        `Destructure errors on ${path}: ${JSON.stringify(destructureErrors)}`
      ).toHaveLength(0)

      await page.close()
    })
  }

  test('No errors during navigation between pages', async () => {
    const page = await context.newPage()
    const errors: { type: string; text: string }[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push({ type: msg.type(), text: msg.text() })
      }
    })

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForPageReady(page, 'page-title', 'Home Page')

    // Navigate through several pages
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      'doc-title',
      'Getting Started'
    )
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      'default-slug-title',
      'Page One'
    )
    await navigateViaLink(page, 'nav-to-docs-index', 'docs-title', 'Documentation')
    await navigateViaLink(page, 'nav-to-home', 'page-title', 'Home Page')

    // Filter out non-critical errors
    const criticalErrors = errors.filter(
      (err) =>
        err.text.includes('Cannot destructure') ||
        err.text.includes('Cannot read properties') ||
        err.text.toLowerCase().includes('hydration') ||
        err.text.includes('useLoader')
    )

    expect(
      criticalErrors,
      `Critical errors during navigation: ${JSON.stringify(criticalErrors)}`
    ).toHaveLength(0)

    await page.close()
  })
})
