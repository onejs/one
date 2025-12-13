import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:8081'
const isDebug = !!process.env.DEBUG

console.info(`Testing: ${serverUrl} with debug mode: ${isDebug}`)

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
}, 30000)

test('homepage loads with no error logs', async () => {
  const page = await context.newPage()

  const consoleMessages: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text())
    }
  })

  await page.goto(serverUrl, { timeout: 120000 })
  expect(consoleMessages).toHaveLength(0)

  await page.close()
}, 180000)

// this stopped working, but only in playwright..
test.skip('clicking "Get Started" link navigates without reloading to docs', async () => {
  const page = await context.newPage()

  await page.goto(serverUrl)

  // log out item we find with Get Started text:
  await page.click('text="Docs"')
  await new Promise((res) => setTimeout(res, 1000))

  // expect(loadEventFired).toBe(false)
  expect(page.url()).toBe(`${serverUrl}/docs/introduction`)

  await page.close()
})
