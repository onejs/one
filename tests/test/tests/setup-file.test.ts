import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!
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

describe('setupFile Tests', { retry: 2, timeout: 60_000 }, () => {
  it('setupFile runs on web client', async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/setup-file-test`)

    // Wait for the client-side effect to run and re-render
    await page.waitForFunction(() => {
      const el = document.querySelector('[data-testid="client-setup-ran"]')
      return el?.textContent?.includes('true')
    }, { timeout: 30_000 })

    // Check that the client setup file ran
    const clientSetupText = await page.textContent('[data-testid="client-setup-ran"]')
    expect(clientSetupText).toContain('true')

    await page.close()
  })
})
