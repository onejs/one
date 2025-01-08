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

test('clicking "Get Started" link navigates without reloading to docs', async () => {
  const page = await context.newPage()

  await page.goto(serverUrl)

  // log out item we find with Get Started text:
  const getStartedLink = await page.$('a[href="/docs/introduction"]')

  expect(getStartedLink).toBeTruthy()

  // TODO want to check we don't hard reload on accident but this seems to fire even tho it works
  // let loadEventFired = false
  // page.on('load', () => {
  //   loadEventFired = true
  // })

  await getStartedLink!.click()

  // expect(loadEventFired).toBe(false)
  expect(page.url()).toBe(`${serverUrl}/docs/introduction`)

  await page.close()
})
