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

test('basic', async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')

  expect(await page.textContent('#content')).toEqual(
    'Hello, this is the basic app test case!'
  )

  await page.close()
})
