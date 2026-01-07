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

test('hooks', { timeout: 60_000 }, async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/hooks')

  // Wait for hydration to complete before interacting
  await page.waitForSelector('a[href="/hooks/contents/page-1"]', { state: 'attached' })

  // Run these multiple times to ensure that the hooks are working correctly,
  // as bugs may emerge while doing so.
  for (let i = 0; i < 3; i++) {
    // Use locators instead of element handles - they're resilient to DOM changes during hydration
    await page.locator('a[href="/hooks"]').click({ force: true })
    await page.waitForURL('**/hooks', { timeout: 10_000 })

    await page.locator('a[href="/hooks/contents/page-1"]').click({ force: true })
    await page.waitForURL('**/hooks/contents/page-1', { timeout: 10_000 })
    // Wait for React state to update after navigation
    await page.waitForFunction(
      () =>
        document.querySelector('#layout-usePathname')?.textContent?.includes('page-1'),
      { timeout: 5_000 }
    )

    expect(await page.textContent('#layout-usePathname')).toEqual(
      'Layout `usePathname()`: /hooks/contents/page-1'
    )
    expect(await page.textContent('#page-usePathname')).toContain(
      'Page `usePathname()`: /hooks/contents/page-1'
    )

    await page.locator('a[href="/hooks/contents/page-2"]').click({ force: true })
    await page.waitForURL('**/hooks/contents/page-2', { timeout: 10_000 })
    // Wait for React state to update after navigation
    await page.waitForFunction(
      () =>
        document.querySelector('#layout-usePathname')?.textContent?.includes('page-2'),
      { timeout: 5_000 }
    )

    expect(await page.textContent('#layout-usePathname')).toEqual(
      'Layout `usePathname()`: /hooks/contents/page-2'
    )
    expect(await page.textContent('#page-usePathname')).toContain(
      'Page `usePathname()`: /hooks/contents/page-2'
    )
  }

  await page.close()
})
