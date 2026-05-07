import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const START_TIMEOUT = 60000

async function waitForPath(page: Page, pathname: string) {
  await page.waitForFunction((expected) => location.pathname === expected, pathname, {
    timeout: 10000,
  })
}

async function clickSeedThread(page: Page) {
  await page.locator('#seed-thread-link').click()
  await waitForPath(page, '/thread/seed-thread-001')
  await page.locator('#thread-screen').waitFor({ timeout: 10000 })
}

async function rootRouteNames(page: Page) {
  return page.evaluate(() => {
    const state = (window as any).__oneDevtools?.rootState
    return state?.routes?.map((route: { name: string }) => route.name) ?? []
  })
}

describe('three punch grouped route navigation', () => {
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

  it(
    'navigates from a dynamic thread route to grouped static siblings repeatedly',
    async () => {
      const page = await context.newPage()
      const serverUrl = process.env.ONE_SERVER_URL!

      await page.goto(`${serverUrl}/forum`, { waitUntil: 'networkidle' })
      await page.locator('#forum-screen').waitFor({ timeout: 10000 })

      await clickSeedThread(page)

      await page.locator('#nav-rankings').click()
      await waitForPath(page, '/forum/rankings')
      await page.locator('#rankings-screen').waitFor({ timeout: 10000 })

      await page.locator('#nav-forum').click()
      await waitForPath(page, '/forum')
      await page.locator('#forum-screen').waitFor({ timeout: 10000 })
      expect(await rootRouteNames(page)).toEqual(['(auth)'])

      await clickSeedThread(page)

      await page.locator('#nav-picks').click()
      await waitForPath(page, '/picks')
      await page.locator('#picks-screen').waitFor({ timeout: 10000 })

      await page.close()
    },
    START_TIMEOUT
  )
})
