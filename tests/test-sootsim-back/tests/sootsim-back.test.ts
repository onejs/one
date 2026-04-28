import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const START_TIMEOUT = 60000

// reproduces the sootsim.com back-navigation bug:
// click a Link to /docs/sootsim, then hit browser back — expected to land
// on /. before the fix, the docs navigator mounted late, picked `index` as
// its initial route (first alphabetical screen) instead of the navigation
// target `[...slug]`, and useLinking saw the resulting state as a same-
// depth change → history.replace instead of history.push, so the only
// entry was the initial / and going back exited the site.
describe('sootsim.com back-navigation', () => {
  let browser: Browser
  let context: BrowserContext

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext()
  })

  afterAll(async () => {
    await context?.close()
    await browser?.close()
  })

  it('clicking a deep link pushes a history entry; back returns to /', async () => {
    const page: Page = await context.newPage()
    const serverUrl = process.env.ONE_SERVER_URL!

    await page.goto(serverUrl, { waitUntil: 'networkidle' })
    await page.waitForSelector('#home-marker', { timeout: START_TIMEOUT })
    await page.waitForTimeout(300)

    // monkey-patch history so we can distinguish push vs replace
    await page.evaluate(() => {
      const origPush = history.pushState.bind(history)
      const origReplace = history.replaceState.bind(history)
      ;(window as any).__hlog = [] as { op: 'push' | 'replace'; url: string }[]
      history.pushState = function (...args: any[]) {
        ;(window as any).__hlog.push({ op: 'push', url: args[2] })
        return origPush(...args)
      } as any
      history.replaceState = function (...args: any[]) {
        ;(window as any).__hlog.push({ op: 'replace', url: args[2] })
        return origReplace(...args)
      } as any
    })

    const beforeLen = await page.evaluate(() => history.length)

    await page.click('#link-to-docs')
    await page.waitForFunction(
      () => location.pathname === '/docs/sootsim',
      undefined,
      { timeout: 10000 }
    )

    // the slug page must be visible (not docs/index) — confirms the docs
    // navigator picked [...slug] as its focused route, with slug=['sootsim']
    await page.locator('#docs-slug-marker').waitFor({ timeout: 10000 })
    expect(await page.locator('#docs-index-marker').count()).toBe(0)

    // we should have seen exactly one pushState for /docs/sootsim. replaces
    // at the same path are harmless (same-state syncs from useLinking).
    const hlog = await page.evaluate(
      () => (window as any).__hlog as { op: 'push' | 'replace'; url: string }[]
    )
    const pushes = hlog.filter((e) => e.op === 'push' && e.url === '/docs/sootsim')
    expect(
      pushes.length,
      `expected at least one pushState for /docs/sootsim, got history log:\n${JSON.stringify(
        hlog,
        null,
        2
      )}`
    ).toBeGreaterThan(0)

    const afterLen = await page.evaluate(() => history.length)
    expect(
      afterLen,
      `history.length should grow by 1 (push), got beforeLen=${beforeLen} afterLen=${afterLen}`
    ).toBe(beforeLen + 1)

    // back should return us to /
    await page.goBack()
    await page.waitForSelector('#home-marker', { timeout: 10000 })
    expect(await page.evaluate(() => location.pathname)).toBe('/')

    await page.close()
  }, START_TIMEOUT)
})
