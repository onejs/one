import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Layout Flicker Test
 *
 * Replicates the takeout.tamagui.dev issue where navigating from /home/feed to /
 * causes a layout flash - the page content appears without the header for 1-2 frames
 * before the full layout renders.
 *
 * The issue is caused by:
 * 1. SiteLayout uses usePathname() to conditionally show SiteHeader vs MainHeader
 * 2. When navigating from /home/* to /, the pathname changes
 * 3. MainHeader unmounts (it's in the nested (tabs) layout)
 * 4. SiteHeader starts mounting in SiteLayout
 * 5. There's a gap where neither header is visible = flash
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
 * Sets up detection for layout flash during navigation.
 * Monitors for moments when header elements disappear.
 */
async function setupLayoutFlashDetection(page: Page) {
  await page.evaluate(() => {
    ;(window as any).__layoutFlashDetected = false
    ;(window as any).__layoutFlashEvents = []
    ;(window as any).__headerStates = []
    ;(window as any).__checkCount = 0

    const checkHeaders = () => {
      ;(window as any).__checkCount++
      const siteHeader = document.querySelector('#site-header')
      const mainHeader = document.querySelector('#main-header')
      const hasSiteHeader = !!siteHeader
      const hasMainHeader = !!mainHeader
      const hasAnyHeader = hasSiteHeader || hasMainHeader

      const state = {
        timestamp: performance.now(),
        checkCount: (window as any).__checkCount,
        hasSiteHeader,
        hasMainHeader,
        hasAnyHeader,
      }

      // keep last 100 states for debugging
      const states = (window as any).__headerStates
      states.push(state)
      if (states.length > 100) states.shift()

      // flash = no header visible at all
      if (!hasAnyHeader) {
        ;(window as any).__layoutFlashDetected = true
        ;(window as any).__layoutFlashEvents.push({
          ...state,
          bodyChildCount: document.body.children.length,
          appContainerExists: !!document.querySelector('#app-container'),
          html: document.body.innerHTML.substring(0, 1000),
        })
      }
    }

    // check on every DOM mutation - this is critical for catching fast changes
    const observer = new MutationObserver(() => {
      // check multiple times per mutation to catch intermediate states
      checkHeaders()
      queueMicrotask(checkHeaders)
    })
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
    })

    // aggressive RAF polling - check every frame
    let running = true
    const checkFrame = () => {
      if (!running) return
      checkHeaders()
      requestAnimationFrame(checkFrame)
    }
    requestAnimationFrame(checkFrame)

    // also use setInterval as backup for very fast changes
    const intervalId = setInterval(checkHeaders, 1)

    ;(window as any).__stopLayoutFlashDetection = () => {
      running = false
      observer.disconnect()
      clearInterval(intervalId)
    }
  })
}

async function getLayoutFlashResults(page: Page) {
  return page.evaluate(() => {
    ;(window as any).__stopLayoutFlashDetection?.()
    return {
      flashDetected: (window as any).__layoutFlashDetected,
      flashEvents: (window as any).__layoutFlashEvents,
      headerStates: (window as any).__headerStates,
    }
  })
}

async function waitForElement(page: Page, selector: string, timeout = 10000) {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const el = await page.$(selector)
    if (el) return true
    await new Promise((r) => setTimeout(r, 50))
  }
  return false
}

describe('Layout Flash - Navigation from /home/feed to /', () => {
  test('navigating from feed to landing should NOT flash (header always visible)', async () => {
    const page = await context.newPage()
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    // start at feed page
    await page.goto(serverUrl + '/home/feed', { waitUntil: 'networkidle' })
    await waitForElement(page, '#main-header')
    await waitForElement(page, '#feed-title')

    // verify we have main header
    const hasMainHeader = await page.$('#main-header')
    expect(hasMainHeader).toBeTruthy()

    // set up flash detection
    await setupLayoutFlashDetection(page)

    // navigate to landing by clicking logo link
    await page.click('#logo-link')
    await page.waitForURL(serverUrl + '/')
    await waitForElement(page, '#site-header')
    await waitForElement(page, '#page-title')

    // small delay to capture any flash
    await new Promise((r) => setTimeout(r, 100))

    const results = await getLayoutFlashResults(page)

    // should have site header now
    const hasSiteHeader = await page.$('#site-header')
    expect(hasSiteHeader).toBeTruthy()

    // THE KEY ASSERTION: no flash should have been detected
    expect(
      results.flashDetected,
      `Layout flash detected! There were ${results.flashEvents.length} moments with no header visible. ` +
        `Events: ${JSON.stringify(results.flashEvents, null, 2)}`
    ).toBe(false)

    expect(errors).toHaveLength(0)
    await page.close()
  })

  test('navigating from feed to landing via link should NOT flash', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/home/feed', { waitUntil: 'networkidle' })
    await waitForElement(page, '#main-header')

    await setupLayoutFlashDetection(page)

    // use the text link instead of logo
    await page.click('#link-home')
    await page.waitForURL(serverUrl + '/')
    await waitForElement(page, '#site-header')

    await new Promise((r) => setTimeout(r, 100))

    const results = await getLayoutFlashResults(page)

    expect(
      results.flashDetected,
      `Layout flash detected via link navigation! Events: ${JSON.stringify(results.flashEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('navigating from landing to feed should NOT flash', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForElement(page, '#site-header')

    await setupLayoutFlashDetection(page)

    await page.click('#cta-login')
    await page.waitForURL('**/home/feed')
    await waitForElement(page, '#main-header')

    await new Promise((r) => setTimeout(r, 100))

    const results = await getLayoutFlashResults(page)

    expect(
      results.flashDetected,
      `Layout flash detected going to feed! Events: ${JSON.stringify(results.flashEvents)}`
    ).toBe(false)

    await page.close()
  })

  test('round trip: landing -> feed -> landing should NOT flash', async () => {
    const page = await context.newPage()

    // start at landing
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    await waitForElement(page, '#site-header')

    await setupLayoutFlashDetection(page)

    // go to feed
    await page.click('#cta-login')
    await page.waitForURL('**/home/feed')
    await waitForElement(page, '#main-header')

    // go back to landing
    await page.click('#logo-link')
    await page.waitForURL(serverUrl + '/')
    await waitForElement(page, '#site-header')

    await new Promise((r) => setTimeout(r, 100))

    const results = await getLayoutFlashResults(page)

    expect(
      results.flashDetected,
      `Layout flash during round trip! Flash count: ${results.flashEvents.length}`
    ).toBe(false)

    await page.close()
  })
})

describe('Layout Structure Verification', () => {
  test('landing page (/) shows SiteHeader', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })

    const siteHeader = await page.$('#site-header')
    const mainHeader = await page.$('#main-header')
    const siteFooter = await page.$('#site-footer')

    expect(siteHeader).toBeTruthy()
    expect(mainHeader).toBeFalsy()
    expect(siteFooter).toBeTruthy()

    await page.close()
  })

  test('feed page (/home/feed) shows MainHeader', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/home/feed', { waitUntil: 'networkidle' })

    const siteHeader = await page.$('#site-header')
    const mainHeader = await page.$('#main-header')
    const siteFooter = await page.$('#site-footer')

    expect(siteHeader).toBeFalsy()
    expect(mainHeader).toBeTruthy()
    expect(siteFooter).toBeFalsy()

    await page.close()
  })

  test('docs page (/docs) shows SiteHeader', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/docs', { waitUntil: 'networkidle' })

    const siteHeader = await page.$('#site-header')
    const mainHeader = await page.$('#main-header')

    expect(siteHeader).toBeTruthy()
    expect(mainHeader).toBeFalsy()

    await page.close()
  })
})
