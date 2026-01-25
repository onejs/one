import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Hydration useId Stability Tests
 *
 * Verifies that React's useId() returns stable values during hydration.
 * If useId changes from SSR format (:R or «R prefix) to client format (:r or «r),
 * it means React abandoned hydration and created a fresh component tree.
 */

const serverUrl = process.env.ONE_SERVER_URL

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

function isSSRFormat(id: string): boolean {
  return id.startsWith(':R') || id.startsWith('«R')
}

describe('Hydration useId Stability', () => {
  it('index page: useId should be stable during hydration', async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const testData = await page.evaluate(() => (window as any).__hydrationTest)

    // root layout should have exactly 1 unique ID (no remount)
    expect(testData.root.ids.length, `Root had multiple IDs: [${testData.root.ids}]`).toBe(1)
    expect(isSSRFormat(testData.root.current), `Root ID "${testData.root.current}" should be SSR format`).toBe(true)

    // page should have exactly 1 unique ID
    expect(testData.page.ids.length, `Page had multiple IDs: [${testData.page.ids}]`).toBe(1)
    expect(isSSRFormat(testData.page.current), `Page ID "${testData.page.current}" should be SSR format`).toBe(true)

    await page.close()
  })

  it('nested page: useId should be stable at all levels', async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/nested/page`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    const testData = await page.evaluate(() => (window as any).__hydrationTest)

    // root layout
    expect(testData.root.ids.length, `Root had multiple IDs: [${testData.root.ids}]`).toBe(1)
    expect(isSSRFormat(testData.root.current), `Root ID "${testData.root.current}" should be SSR format`).toBe(true)

    // nested layout
    expect(testData.nested.ids.length, `Nested had multiple IDs: [${testData.nested.ids}]`).toBe(1)
    expect(isSSRFormat(testData.nested.current), `Nested ID "${testData.nested.current}" should be SSR format`).toBe(true)

    // page
    expect(testData.page.ids.length, `Page had multiple IDs: [${testData.page.ids}]`).toBe(1)
    expect(isSSRFormat(testData.page.current), `Page ID "${testData.page.current}" should be SSR format`).toBe(true)

    await page.close()
  })

  it('should not re-render after initial hydration', async () => {
    const page = await context.newPage()

    await page.goto(`${serverUrl}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(300)

    const initialData = await page.evaluate(() => JSON.parse(JSON.stringify((window as any).__hydrationTest)))

    // wait to detect any delayed re-renders
    await page.waitForTimeout(1500)

    const finalData = await page.evaluate(() => (window as any).__hydrationTest)

    expect(finalData.root.renders, 'Root re-rendered after hydration').toBe(initialData.root.renders)
    expect(finalData.page.renders, 'Page re-rendered after hydration').toBe(initialData.page.renders)

    await page.close()
  })
})
