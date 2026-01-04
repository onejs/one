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

test('navigate into nested page, then back and forward to same page', { retry: 2, timeout: 60_000 }, async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/hooks/cases/navigating-into-nested-navigator')

  await page.waitForSelector('[data-testid="navigate-into-nested-page"]', { timeout: 30_000 })
  await page.getByTestId('navigate-into-nested-page').click()
  await page.waitForURL('**/page', { timeout: 30_000 })

  // Verify that initial hook values are correct
  expect(
    (await page.getByTestId('pathname').textContent())?.endsWith('nested-1/nested-2/page')
  ).toBe(true)
  expect(
    (await page.getByTestId('pathname-on-first-render').textContent())?.endsWith(
      'nested-1/nested-2/page'
    )
  ).toBe(true)

  // Navigate back and forward to the same page
  await page.goBack()
  await page.waitForURL('**/navigating-into-nested-navigator', { timeout: 30_000 })
  await page.goForward()
  await page.waitForURL('**/page', { timeout: 30_000 })

  // Verify that hook values are still correct
  expect(
    (await page.getByTestId('pathname').textContent())?.endsWith('nested-1/nested-2/page')
  ).toBe(true)
  expect(
    (await page.getByTestId('pathname-on-first-render').textContent())?.endsWith(
      'nested-1/nested-2/page'
    )
  ).toBe(true)

  await page.close()
})
