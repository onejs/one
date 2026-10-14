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

describe('skew protection — reload loop guard', () => {
  it('does not reload again within 10s of a skew reload', async () => {
    const page = await context.newPage()
    try {
      await page.goto(`${serverUrl}/`)
      await page.evaluate(() =>
        sessionStorage.setItem('__one_skew_reload', String(Date.now()))
      )
      let loadCount = 0
      page.on('load', () => loadCount++)
      await page.goto(`${serverUrl}/crash?type=chunk`, {
        waitUntil: 'domcontentloaded',
      })
      // the boundary's chunk-error reload lands within this window when unguarded
      await new Promise((r) => setTimeout(r, 3000))
      expect(loadCount).toBe(1)
    } finally {
      await page.close()
    }
  })
})

// a tab that loaded before a deploy still holds the old build. the destination's
// route chunks are gone, so the first link click must load the destination as a
// document. reloading the current page instead drops the click.
describe('skew protection — link click after a deploy', () => {
  const link = 'a[href="/destination"]'

  async function openStart({
    deployed,
    hydrated,
  }: {
    deployed: boolean
    hydrated: boolean
  }) {
    const page = await context.newPage()
    const documents: string[] = []
    page.on('request', (request) => {
      if (request.resourceType() === 'document') {
        documents.push(new URL(request.url()).pathname)
      }
    })
    if (deployed) {
      // only the old document's requests miss: a fresh document gets the new build
      await page.route('**/assets/*destination*', (route) => {
        if (documents.length === 1) {
          return route.fulfill({
            status: 404,
            contentType: 'text/html',
            body: 'not found',
          })
        }
        return route.continue()
      })
    }
    await page.goto(`${serverUrl}/start`, { waitUntil: hydrated ? 'load' : 'commit' })
    if (hydrated) {
      await page.waitForFunction(
        (selector) =>
          Object.keys(document.querySelector(selector) || {}).some((key) =>
            key.startsWith('__reactProps$')
          ),
        link
      )
      await page.evaluate(() => {
        sessionStorage.removeItem('__one_skew_reload')
        ;(window as any).__startMarker = true
      })
    }
    return { page, documents }
  }

  it('hydrated click loads the destination, not the current page', async () => {
    const { page, documents } = await openStart({ deployed: true, hydrated: true })
    try {
      const nextDocument = page.waitForRequest(
        (request) => request.resourceType() === 'document'
      )
      await page.click(link)
      expect(new URL((await nextDocument).url()).pathname).toBe('/destination')
      await page.waitForSelector('#destination-mounted')
      expect(new URL(page.url()).pathname).toBe('/destination')
      expect(documents).toEqual(['/start', '/destination'])
      expect(await page.evaluate(() => (window as any).__startMarker)).toBeUndefined()
    } finally {
      await page.close()
    }
  })

  it('click before hydration settles loads the destination', async () => {
    const { page, documents } = await openStart({ deployed: true, hydrated: false })
    try {
      const nextDocument = page.waitForRequest(
        (request) => request.resourceType() === 'document'
      )
      await page.click(link)
      expect(new URL((await nextDocument).url()).pathname).toBe('/destination')
      await page.waitForSelector('#destination-mounted')
      expect(new URL(page.url()).pathname).toBe('/destination')
      expect(documents).toEqual(['/start', '/destination'])
    } finally {
      await page.close()
    }
  })

  it('without a deploy the same click navigates on the client', async () => {
    const { page, documents } = await openStart({ deployed: false, hydrated: true })
    try {
      await page.click(link)
      await page.waitForSelector('#destination-mounted')
      expect(new URL(page.url()).pathname).toBe('/destination')
      expect(documents).toEqual(['/start'])
      expect(await page.evaluate(() => (window as any).__startMarker)).toBe(true)
    } finally {
      await page.close()
    }
  })
})
