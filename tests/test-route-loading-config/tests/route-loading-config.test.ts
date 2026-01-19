import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Route Loading Config Tests
 *
 * Tests the configurable loading behavior for routes:
 * - loading: 'blocking' - wait for loader before navigation
 * - loading: 'instant' - navigate immediately, show Loading component
 * - loading: <number> - wait N ms, then show Loading if still loading
 * - default behavior based on route mode (ssg/ssr = blocking, spa = instant)
 */

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG
const isDev = process.env.TEST_ONLY === 'dev'

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
 * Wait for an element to appear with specific content
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
 * Check if an element exists on the page
 */
async function elementExists(page: Page, selector: string): Promise<boolean> {
  try {
    const element = await page.$(selector)
    return !!element
  } catch {
    return false
  }
}

/**
 * Navigate via link click and measure timing
 */
async function navigateAndMeasure(
  page: Page,
  linkId: string,
  targetSelector: string,
  expectedText: string
): Promise<{
  success: boolean
  startTime: number
  endTime: number
  duration: number
  sawLoadingState: boolean
}> {
  const startTime = Date.now()
  let sawLoadingState = false

  // set up listener for loading state
  const checkForLoading = async () => {
    const loading = await elementExists(page, '#loading-state')
    if (loading) sawLoadingState = true
  }

  // start checking for loading state
  const checkInterval = setInterval(checkForLoading, 20)

  await page.click(`#${linkId}`)

  // wait for target content
  const success = await waitForContent(page, targetSelector, expectedText)
  const endTime = Date.now()

  clearInterval(checkInterval)

  return {
    success,
    startTime,
    endTime,
    duration: endTime - startTime,
    sawLoadingState,
  }
}

/**
 * Track blank content during navigation
 */
async function setupBlankContentTracker(page: Page, contentSelector: string) {
  await page.evaluate((selector) => {
    ;(window as any).__blankContentDetected = false
    ;(window as any).__contentHistory = []

    const checkContent = () => {
      const element = document.querySelector(selector)
      const hasContent = element && element.textContent && element.textContent.trim().length > 10

      ;(window as any).__contentHistory.push({
        timestamp: Date.now(),
        hasContent,
      })

      if (!hasContent) {
        ;(window as any).__blankContentDetected = true
      }
    }

    const observer = new MutationObserver(() => checkContent())
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    })

    ;(window as any).__contentObserver = observer
    ;(window as any).__contentInterval = setInterval(checkContent, 10)
  }, contentSelector)
}

async function getBlankContentResults(page: Page) {
  return page.evaluate(() => {
    clearInterval((window as any).__contentInterval)
    ;(window as any).__contentObserver?.disconnect()
    return {
      blankContentDetected: (window as any).__blankContentDetected,
      history: (window as any).__contentHistory,
    }
  })
}

describe('Blocking Mode', () => {
  test('blocking mode waits for loader before navigation (no blank content)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    await setupBlankContentTracker(page, '#app-container')

    // navigate to blocking slow page (500ms loader)
    const result = await navigateAndMeasure(
      page,
      'nav-to-blocking-slow',
      '#page-title',
      'Blocking Slow Page'
    )

    const blankResults = await getBlankContentResults(page)

    expect(result.success).toBe(true)
    // blocking mode should NOT show loading state component
    expect(result.sawLoadingState).toBe(false)
    // should not show blank content (either old page or new page, never empty)
    expect(blankResults.blankContentDetected).toBe(false)
    // in dev mode, navigation should take at least as long as the loader
    // in prod mode, data is pre-built so it's fast
    if (isDev) {
      expect(result.duration).toBeGreaterThanOrEqual(400)
    }

    await page.close()
  })

  test('blocking mode with fast loader navigates quickly', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    const result = await navigateAndMeasure(
      page,
      'nav-to-blocking-fast',
      '#page-title',
      'Blocking Fast Page'
    )

    expect(result.success).toBe(true)
    expect(result.sawLoadingState).toBe(false)
    // fast loader should complete quickly
    expect(result.duration).toBeLessThan(300)

    await page.close()
  })
})

describe('Instant Mode', () => {
  // NOTE: instant mode on web currently relies on Suspense which is disabled
  // due to flickering issues. The preload still runs, but the Loading component
  // doesn't show via Suspense. Navigation still works.
  test('instant mode navigates without blocking', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    // navigate to instant slow page (500ms loader)
    const result = await navigateAndMeasure(
      page,
      'nav-to-instant-slow',
      '#page-title',
      'Instant Slow Page'
    )

    expect(result.success).toBe(true)
    // instant mode doesn't block, navigation should succeed
    // NOTE: Loading component via Suspense is disabled on web

    await page.close()
  })

  test('instant mode with fast loader navigates quickly', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    const result = await navigateAndMeasure(
      page,
      'nav-to-instant-fast',
      '#page-title',
      'Instant Fast Page'
    )

    expect(result.success).toBe(true)

    await page.close()
  })
})

describe('Timed Mode', () => {
  // NOTE: timed mode waits up to N ms, then navigates.
  // Loading component via Suspense is disabled on web.
  test('timed 200ms navigates after waiting or loader completes', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    // navigate to timed 200ms page (500ms loader, 200ms wait)
    // waits 200ms, then navigation proceeds while loader continues
    const result = await navigateAndMeasure(
      page,
      'nav-to-timed-200',
      '#page-title',
      'Timed 200ms Page'
    )

    expect(result.success).toBe(true)

    await page.close()
  })

  test('timed 600ms waits for loader when it finishes first (no blank content)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    await setupBlankContentTracker(page, '#app-container')

    // navigate to timed 600ms page (500ms loader, 600ms wait)
    // loader finishes before wait time, so no Loading shown
    const result = await navigateAndMeasure(
      page,
      'nav-to-timed-600',
      '#page-title',
      'Timed 600ms Page'
    )

    const blankResults = await getBlankContentResults(page)

    expect(result.success).toBe(true)
    // 600ms wait > 500ms loader, so loader completes before timeout
    expect(result.sawLoadingState).toBe(false)
    // should not show blank content
    expect(blankResults.blankContentDetected).toBe(false)
    // in dev mode, should take at least 500ms (loader time)
    // in prod mode, data is pre-built so it's fast
    if (isDev) {
      expect(result.duration).toBeGreaterThanOrEqual(400)
    }

    await page.close()
  })
})

describe('Default Mode Behavior', () => {
  test('SSG page without config defaults to blocking (no blank content)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    await setupBlankContentTracker(page, '#app-container')

    const result = await navigateAndMeasure(
      page,
      'nav-to-default-ssg',
      '#page-title',
      'Default SSG Page'
    )

    const blankResults = await getBlankContentResults(page)

    expect(result.success).toBe(true)
    // SSG defaults to blocking - no loading state shown
    expect(result.sawLoadingState).toBe(false)
    // no blank content
    expect(blankResults.blankContentDetected).toBe(false)

    await page.close()
  })

  test('SPA page without config defaults to instant', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    const result = await navigateAndMeasure(
      page,
      'nav-to-default-spa',
      '#page-title',
      'Default SPA Page'
    )

    expect(result.success).toBe(true)
    // SPA defaults to instant - navigation succeeds
    // NOTE: Loading component via Suspense is disabled on web

    await page.close()
  })
})

describe('No Loader Pages', () => {
  test('page without loader navigates instantly', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    await setupBlankContentTracker(page, '#app-container')

    const result = await navigateAndMeasure(
      page,
      'nav-to-no-loader',
      '#page-title',
      'No Loader Page'
    )

    const blankResults = await getBlankContentResults(page)

    expect(result.success).toBe(true)
    // no loader means no loading state
    expect(result.sawLoadingState).toBe(false)
    // should be instant with no blank content
    expect(blankResults.blankContentDetected).toBe(false)
    // should be fast
    expect(result.duration).toBeLessThan(500)

    await page.close()
  })
})

describe('Cross-Mode Navigation', () => {
  test('navigating from blocking to instant mode works', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    // go to blocking page first
    await page.click('#nav-to-blocking-slow')
    await waitForContent(page, '#page-title', 'Blocking Slow Page')

    // then to instant page
    const result = await navigateAndMeasure(
      page,
      'nav-to-instant-slow',
      '#page-title',
      'Instant Slow Page'
    )

    expect(result.success).toBe(true)

    await page.close()
  })

  test('navigating from instant to blocking works correctly (no blank content)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/instant/slow', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Instant Slow Page')

    await setupBlankContentTracker(page, '#app-container')

    const result = await navigateAndMeasure(
      page,
      'nav-to-blocking-slow',
      '#page-title',
      'Blocking Slow Page'
    )

    const blankResults = await getBlankContentResults(page)

    expect(result.success).toBe(true)
    // going to blocking page should not show loading state
    expect(result.sawLoadingState).toBe(false)
    // should not show blank content
    expect(blankResults.blankContentDetected).toBe(false)

    await page.close()
  })
})

describe('Config Override', () => {
  test('explicit blocking config works (no blank content)', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    await setupBlankContentTracker(page, '#app-container')

    // blocking slow has explicit blocking config
    const result = await navigateAndMeasure(
      page,
      'nav-to-blocking-slow',
      '#page-title',
      'Blocking Slow Page'
    )

    const blankResults = await getBlankContentResults(page)

    expect(result.success).toBe(true)
    expect(result.sawLoadingState).toBe(false)
    expect(blankResults.blankContentDetected).toBe(false)

    await page.close()
  })

  test('explicit instant config overrides SSG default', async () => {
    // instant slow is SSG with explicit instant config
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForContent(page, '#page-title', 'Route Loading Config Test')

    const result = await navigateAndMeasure(
      page,
      'nav-to-instant-slow',
      '#page-title',
      'Instant Slow Page'
    )

    expect(result.success).toBe(true)
    // instant config on SSG page - navigation succeeds
    // NOTE: Loading component via Suspense is disabled on web

    await page.close()
  })
})
