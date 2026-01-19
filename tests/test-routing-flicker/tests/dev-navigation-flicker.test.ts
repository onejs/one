import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Dev Mode Navigation Flicker Tests
 *
 * These tests verify that pages don't show empty/blank content during
 * client-side navigation in DEVELOPMENT mode.
 *
 * The issue: In dev mode, preloadRoute() returns early without preloading
 * the loader data. This means when navigation happens, the component mounts
 * with no data, useLoader throws a promise (Suspense), and the user briefly
 * sees blank content before the data loads.
 *
 * Expected behavior: Content should transition smoothly without showing
 * blank/empty states during navigation - same as production.
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

/**
 * Track content visibility during navigation.
 * Returns true if content ever disappeared during navigation.
 */
async function setupContentTracker(page: Page, contentSelector: string) {
  await page.evaluate((selector) => {
    ;(window as any).__contentVisibilityHistory = []
    ;(window as any).__blankContentDetected = false

    const checkContent = () => {
      const element = document.querySelector(selector)
      const hasContent =
        element && element.textContent && element.textContent.trim().length > 10

      ;(window as any).__contentVisibilityHistory.push({
        timestamp: Date.now(),
        hasContent,
        content: element?.textContent?.substring(0, 100) || '',
      })

      if (!hasContent) {
        ;(window as any).__blankContentDetected = true
      }
    }

    // check frequently during navigation
    const observer = new MutationObserver(() => checkContent())
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    ;(window as any).__contentObserver = observer

    // also poll to catch any missed states
    ;(window as any).__contentInterval = setInterval(checkContent, 10)
  }, contentSelector)
}

async function getContentTrackerResults(page: Page) {
  return page.evaluate(() => {
    clearInterval((window as any).__contentInterval)
    ;(window as any).__contentObserver?.disconnect()
    return {
      blankContentDetected: (window as any).__blankContentDetected,
      history: (window as any).__contentVisibilityHistory,
    }
  })
}

/**
 * Wait for an element to appear with content
 */
async function waitForContent(
  page: Page,
  selector: string,
  expectedText: string,
  timeout = 15000
): Promise<boolean> {
  const startTime = Date.now()
  while (Date.now() - startTime < timeout) {
    try {
      const element = await page.$(selector)
      if (element) {
        const text = await element.textContent()
        if (text && text.includes(expectedText)) {
          return true
        }
      }
    } catch {
      // element not found yet
    }
    await new Promise((res) => setTimeout(res, 50))
  }
  return false
}

/**
 * Navigate via link and wait for target content
 */
async function navigateViaLink(
  page: Page,
  linkId: string,
  targetSelector: string,
  expectedText: string
): Promise<boolean> {
  // wait for link to be visible
  const linkFound = await page
    .waitForSelector(`#${linkId}`, {
      state: 'visible',
      timeout: 10000,
    })
    .catch(() => null)

  if (!linkFound) {
    throw new Error(`Link #${linkId} not found`)
  }

  await page.click(`#${linkId}`)
  return waitForContent(page, targetSelector, expectedText)
}

describe('Dev Mode Navigation - No Blank Content', () => {
  test('navigating from page with loader to page with loader should not show blank content', async () => {
    const page = await context.newPage()

    // capture console errors for debugging
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // start at docs getting-started (has loader)
    await page.goto(serverUrl + '/docs/getting-started', { waitUntil: 'networkidle' })
    await waitForContent(page, '#doc-title', 'Getting Started')

    // set up content tracker watching the app container
    await setupContentTracker(page, '#app-container')

    // navigate to another doc page with loader
    await navigateViaLink(
      page,
      'nav-to-docs-api-reference',
      '#doc-title',
      'API Reference'
    )

    // small wait to ensure any blank flashes would have occurred
    await new Promise((res) => setTimeout(res, 200))

    const results = await getContentTrackerResults(page)

    // the issue: in dev mode, blank content is detected during navigation
    // because preloadRoute returns early and useLoader has to fetch data
    expect(
      results.blankContentDetected,
      `Blank content detected during navigation! This is the dev mode flicker bug. History: ${JSON.stringify(results.history.slice(-10), null, 2)}`
    ).toBe(false)

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('rapid navigation between pages with loaders should not show blank content', async () => {
    const page = await context.newPage()

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // start at home page which has link to docs
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Home Page')

    await setupContentTracker(page, '#app-container')

    // navigate to docs index
    await navigateViaLink(page, 'nav-to-docs-index', '#docs-title', 'Documentation')
    // navigate to getting-started
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      '#doc-title',
      'Getting Started'
    )
    // navigate to api-reference
    await navigateViaLink(
      page,
      'nav-to-docs-api-reference',
      '#doc-title',
      'API Reference'
    )
    // navigate back home
    await navigateViaLink(page, 'nav-to-home', '#page-title', 'Home Page')

    const results = await getContentTrackerResults(page)

    expect(
      results.blankContentDetected,
      `Blank content detected during rapid navigation! History: ${JSON.stringify(results.history.slice(-20), null, 2)}`
    ).toBe(false)

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('navigation between SSG and default mode pages should not show blank content', async () => {
    const page = await context.newPage()

    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // start at home (SSG)
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Home Page')

    await setupContentTracker(page, '#app-container')

    // navigate to default mode page (uses defaultRenderMode)
    await navigateViaLink(
      page,
      'nav-to-default-index',
      '#default-title',
      'Default Mode Index'
    )

    // navigate to default mode dynamic page
    await navigateViaLink(
      page,
      'nav-to-default-page-one',
      '#default-slug-title',
      'Page One'
    )

    // navigate back to SSG page
    await navigateViaLink(
      page,
      'nav-to-docs-getting-started',
      '#doc-title',
      'Getting Started'
    )

    const results = await getContentTrackerResults(page)

    expect(
      results.blankContentDetected,
      `Blank content detected during cross-mode navigation! History: ${JSON.stringify(results.history.slice(-20), null, 2)}`
    ).toBe(false)

    expect(errors).toHaveLength(0)
    await page.close()
  })
})
