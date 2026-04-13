import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!
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

// NOTE: window.location.reload can't be reliably overridden in chromium, so
// we count actual page loads via playwright's `load` event. each reload
// triggers an additional load.
describe('skew protection — auto-reload from error boundaries', () => {
  it('reloads on a chunk-load error (no version check needed)', async () => {
    const page = await context.newPage()
    let loadCount = 0
    page.on('load', () => loadCount++)

    try {
      await page.goto(`${serverUrl}/crash?type=chunk`, {
        waitUntil: 'domcontentloaded',
      })
      // initial load + the boundary-triggered reload
      await new Promise((r) => setTimeout(r, 3000))
      expect(loadCount).toBeGreaterThanOrEqual(2)
    } finally {
      await page.close()
    }
  })

  it('does NOT reload when /version.json matches (genuine bug shows error UI)', async () => {
    const page = await context.newPage()
    let loadCount = 0
    page.on('load', () => loadCount++)

    try {
      await page.goto(`${serverUrl}/crash?type=other`, {
        waitUntil: 'domcontentloaded',
      })
      // wait long enough for the version-check fetch to round-trip and a
      // potential reload to happen if it were going to
      await new Promise((r) => setTimeout(r, 3000))
      expect(loadCount).toBe(1)
      // the route-level error boundary's fallback UI should be visible
      const bodyText = await page.evaluate(() => document.body.innerText)
      expect(bodyText).toMatch(/boom: synthetic render error for skew test/)
    } finally {
      await page.close()
    }
  })

  it('reloads on a generic error when /version.json reports a mismatch', async () => {
    const page = await context.newPage()
    let loadCount = 0
    page.on('load', () => loadCount++)

    // intercept /version.json and respond with a wrong version so the
    // checkSkewAndReload fetch detects skew
    await page.route('**/version.json', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ version: 'definitely-not-the-current-build-key' }),
      })
    })

    try {
      await page.goto(`${serverUrl}/crash?type=other`, {
        waitUntil: 'domcontentloaded',
      })
      await new Promise((r) => setTimeout(r, 4000))
      expect(loadCount).toBeGreaterThanOrEqual(2)
    } finally {
      await page.close()
    }
  })
})
