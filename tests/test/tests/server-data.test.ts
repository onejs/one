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

test('setServerData getServerData', async () => {
  const stringiifed = '{"fromServer":true}'

  const response = await fetch(serverUrl)
  const html = await response.text()
  expect(html.includes(stringiifed)).toBeTruthy()

  const page = await context.newPage()

  await page.goto(serverUrl + '/server-data')

  const textContent = await page.textContent('#loader-data')
  expect(textContent).toContain(stringiifed)

  await page.close()
})
