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

test('hooks', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/hooks')

  // Run these multiple times to ensure that the hooks are working correctly,
  // as bugs may emerge while doing so.
  for (let i = 0; i < 3; i++) {
    const link0 = await page.$('a[href="/hooks"]')
    await link0?.click({
      force: true,
    })
    await page.waitForURL('**/hooks', { timeout: 5_000 })

    const link1 = await page.$('a[href="/hooks/contents/page-1"]')
    await link1?.click({
      force: true,
    })
    await page.waitForURL('**/hooks/contents/page-1', { timeout: 5_000 })

    expect(await page.textContent('#layout-usePathname')).toEqual(
      'Layout `usePathname()`: /hooks/contents/page-1'
    )
    expect(await page.textContent('#page-usePathname')).toContain(
      'Page `usePathname()`: /hooks/contents/page-1'
    )

    const link2 = await page.$('a[href="/hooks/contents/page-2"]')
    await link2?.click({
      force: true,
    })
    await page.waitForURL('**/hooks/contents/page-2', { timeout: 5_000 })

    expect(await page.textContent('#layout-usePathname')).toEqual(
      'Layout `usePathname()`: /hooks/contents/page-2'
    )
    expect(await page.textContent('#page-usePathname')).toContain(
      'Page `usePathname()`: /hooks/contents/page-2'
    )
  }

  await page.close()
})
