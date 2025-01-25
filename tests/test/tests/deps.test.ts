import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

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

describe('Deps (web)', () => {
  test('expo-image', async () => {
    const page = await context.newPage()

    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    await page.goto(serverUrl + '/deps/expo-image')

    const img = await page.$('img[src=https://tamagui.dev/social.png]')

    expect(img).not.toBeNull()
    expect(consoleErrors).toHaveLength(0)

    await page.close()
  })
})
