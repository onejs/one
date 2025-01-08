import { type Browser, type BrowserContext, webkit } from 'playwright'
import { afterAll, beforeAll, expect, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:8081'
console.info(`Testing: ${serverUrl}`)

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await webkit.launch()
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

test('homepage loads with no error logs', async () => {
  const page = await context.newPage()

  const consoleMessages: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text())
    }
  })

  await page.goto(serverUrl)
  expect(consoleMessages).toHaveLength(0)

  await page.close()
})

test('clicking "Get Started" link navigates without reloading to /docs', async () => {
  const page = await context.newPage()

  await page.goto(serverUrl)
  const [response] = await Promise.all([page.waitForNavigation(), page.click('text=Get Started')])

  console.warn('response', response)

  expect(response.url()).toBe(`${serverUrl}/docs`)

  await page.close()
})
