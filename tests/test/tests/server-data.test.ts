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
  const url = serverUrl + '/server-data'

  const response = await fetch(url)
  const html = await response.text()

  expect(html.includes(`<div id="server-data">{&quot;fromServer&quot;:true}</div>`)).toBeTruthy()

  const page = await context.newPage()

  await page.goto(url)

  const textContent = await page.textContent('#server-data')
  expect(textContent).toContain(`{"fromServer":true}`)

  await page.close()
})
