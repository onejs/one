import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const START_TIMEOUT = 60000

describe('three-punch dynamic route navigation', () => {
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

  it('navigates from a stacked thread route to forum rankings', async () => {
    const page: Page = await context.newPage()
    const serverUrl = process.env.ONE_SERVER_URL!

    await page.goto(`${serverUrl}/forum`, { waitUntil: 'networkidle' })
    await page.locator('#forum-page').waitFor({ timeout: START_TIMEOUT })

    await page.click('#seed-thread-link')
    await page.waitForFunction(
      () => location.pathname === '/thread/seed-thread-001',
      undefined,
      { timeout: 10000 }
    )
    await page.locator('#thread-page').waitFor({ timeout: 10000 })
    expect(await page.locator('#thread-id').textContent()).toBe('seed-thread-001')

    await page.click('#nav-rankings')
    await page.waitForFunction(
      () => location.pathname === '/forum/rankings',
      undefined,
      { timeout: 10000 }
    )
    await page.locator('#forum-rankings-page').waitFor({ timeout: 10000 })
    expect(await page.locator('#thread-page').count()).toBe(0)

    await page.close()
  }, START_TIMEOUT)
})
