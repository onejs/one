import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

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

test(
  'usePathname in layout with delayed Slot returns full path for route group child',
  { timeout: 30_000 },
  async () => {
    const page = await context.newPage()

    // direct navigation to a nested route inside a (tabs) route group
    // the parent layout has an auth-like gate that delays rendering Slot
    await page.goto(serverUrl + '/hooks/cases/route-group-pathname/search')
    await page.waitForSelector('#group-page-pathname', {
      state: 'attached',
      timeout: 10_000,
    })
    await page.waitForTimeout(2000)

    const parentPathname = await page.textContent('#group-parent-pathname')
    const tabsPathname = await page.textContent('#group-tabs-pathname')
    const pagePathname = await page.textContent('#group-page-pathname')

    // all levels should see the full pathname — not a truncated or default path
    expect(pagePathname).toBe('/hooks/cases/route-group-pathname/search')
    expect(tabsPathname).toBe('/hooks/cases/route-group-pathname/search')
    expect(parentPathname).toBe('/hooks/cases/route-group-pathname/search')

    await page.close()
  }
)

test(
  'usePathname in layout with delayed Slot returns full path for default route group child',
  { timeout: 30_000 },
  async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/hooks/cases/route-group-pathname/feed')
    await page.waitForSelector('#group-page-pathname', {
      state: 'attached',
      timeout: 10_000,
    })
    await page.waitForTimeout(2000)

    const parentPathname = await page.textContent('#group-parent-pathname')
    const pagePathname = await page.textContent('#group-page-pathname')

    expect(pagePathname).toBe('/hooks/cases/route-group-pathname/feed')
    expect(parentPathname).toBe('/hooks/cases/route-group-pathname/feed')

    await page.close()
  }
)
