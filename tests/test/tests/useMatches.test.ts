import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

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

describe('useMatches', () => {
  test('returns matched routes with loader data', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/matches-test')
    await page.waitForLoadState('networkidle')

    // wait for layout loader data to be present (not 'loading')
    await page.waitForFunction(
      () => !document.querySelector('[data-testid="layout-data"]')?.textContent?.includes('loading'),
      { timeout: 5000 }
    )

    // verify layout loader data is present
    const layoutData = await page.textContent('[data-testid="layout-data"]')
    expect(layoutData).toContain('layout-loader-data')

    // verify page loader data is present
    const pageData = await page.textContent('[data-testid="page-data"]')
    expect(pageData).toContain('page-loader-data')

    // verify matches count is at least 2 (root layout, matches-test layout, page = 3)
    const matchesCount = await page.textContent('[data-testid="matches-count"]')
    const count = parseInt(matchesCount?.match(/\d+/)?.[0] || '0')
    expect(count).toBeGreaterThanOrEqual(2)

    // verify page match has correct routeId
    const pageMatchRouteId = await page.textContent('[data-testid="page-match-routeid"]')
    expect(pageMatchRouteId).toContain('matches-test')

    await page.close()
  })

  test('useMatches includes all route loader data', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/matches-test')
    await page.waitForLoadState('networkidle')

    // get all matches JSON
    const matchesJson = await page.textContent('[data-testid="all-matches"]')
    const matches = JSON.parse(matchesJson || '[]')

    // find the layout match
    const layoutMatch = matches.find((m: { routeId: string }) =>
      m.routeId.includes('matches-test/_layout')
    )
    expect(layoutMatch).toBeDefined()
    expect(layoutMatch.loaderData).toBeDefined()
    expect(layoutMatch.loaderData.layoutData).toBe('layout-loader-data')

    // find the page match
    const pageMatch = matches.find((m: { routeId: string }) =>
      m.routeId.includes('matches-test/index')
    )
    expect(pageMatch).toBeDefined()
    expect(pageMatch.loaderData).toBeDefined()
    expect(pageMatch.loaderData.pageData).toBe('page-loader-data')

    await page.close()
  })
})
