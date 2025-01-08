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

test('SSG - initial load with loader, then navigate to a new loader', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/loader')

  const textContent = await page.textContent('#loader-data')
  expect(textContent).toContain('loader-success')

  const link = await page.$('a[href="/loader/other"]')
  await link?.click({
    force: true,
  })

  await new Promise((res) => setTimeout(res, 500))

  expect(page.url()).toBe(`${serverUrl}/loader/other`)

  expect(await page.textContent('#loader-data-two')).toContain('loader-success-two')

  await page.close()
})
