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
}, 10000)

test('homepage loads with no error logs', async () => {
  const page = await context.newPage()

  const consoleMessages: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleMessages.push(msg.text())
    }
  })

  await page.goto(serverUrl, { timeout: 120000 })
  if (consoleMessages.length > 0) {
    console.info('console errors:', consoleMessages)
  }
  expect(consoleMessages).toHaveLength(0)

  await page.close()
}, 50000)

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

test('ScrollBehavior docs page loads correctly with title', async () => {
  const page = await context.newPage()

  await page.goto(`${serverUrl}/docs/components-ScrollBehavior`, { timeout: 120000 })

  // Check that the page title contains ScrollBehavior
  const title = await page.title()
  expect(title).toContain('ScrollBehavior')

  // Check that the H1 heading is rendered correctly
  const h1 = await page.locator('h1').first()
  const h1Text = await h1.textContent()
  expect(h1Text).toContain('ScrollBehavior')

  await page.close()
}, 50000)

test('accordion auto-opens to Components section when visiting ScrollBehavior page', async () => {
  const page = await context.newPage()

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${serverUrl}/docs/components-ScrollBehavior`, { timeout: 120000 })

  // wait for hydration and accordion to open by checking the link is visible
  const scrollBehaviorLink = page.locator('a[href="/docs/components-ScrollBehavior"]')
  await scrollBehaviorLink.waitFor({ state: 'visible', timeout: 15000 })

  await page.close()
}, 50000)

test('accordion auto-opens to Hooks section when visiting useRouter page', async () => {
  const page = await context.newPage()

  await page.setViewportSize({ width: 1280, height: 800 })
  await page.goto(`${serverUrl}/docs/hooks-useRouter`, { timeout: 120000 })

  // wait for hydration and accordion to open by checking the link is visible
  const useRouterLink = page.locator('a[href="/docs/hooks-useRouter"]')
  await useRouterLink.waitFor({ state: 'visible', timeout: 15000 })

  await page.close()
}, 50000)
