// NOTE THIS IS TRUE BUT IDK HOW TO DO THIS IN CI/CD??

// import puppeteer, { type Browser, type Page } from 'puppeteer'
// import { afterAll, beforeAll, describe, expect, it } from 'vitest'

// /**
//  * Hydration ID Remount Tests
//  *
//  * These tests use Puppeteer with real Chrome (NOT Playwright's Chromium)
//  * because the hydration bug only reproduces in real browsers.
//  *
//  * The bug: useId() changes from SSR format (uppercase R like «Rd6qlj»)
//  * to client format (lowercase r like «r0») during hydration, which means
//  * React abandoned hydration and remounted the component tree.
//  */

// const serverUrl = process.env.ONE_SERVER_URL

// let browser: Browser

// beforeAll(async () => {
//   browser = await puppeteer.launch({
//     headless: true,
//     executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
//     args: ['--no-sandbox'],
//   })
// })

// afterAll(async () => {
//   await browser.close()
// })

import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Hydration ID Remount Tests
 *
 * These tests use Puppeteer with real Chrome (NOT Playwright's Chromium)
 * because the hydration bug only reproduces in real browsers.
 *
 * The bug: useId() changes from SSR format (uppercase R like «Rd6qlj»)
 * to client format (lowercase r like «r0») during hydration, which means
 * React abandoned hydration and remounted the component tree.
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

function isClientFormat(id: string): boolean {
  return id.startsWith(':r') || id.startsWith('«r')
}

describe('Hydration ID Remount Detection', () => {
  it('useId should NOT change from SSR to client format during hydration', async () => {
    const page = await browser.newPage()

    const consoleLogs: string[] = []
    page.on('console', (msg) => {
      consoleLogs.push(msg.text())
    })

    await page.goto(`${serverUrl}/`, { waitUntil: 'load' })
    await new Promise((r) => setTimeout(r, 3000))

    // Extract page IDs from console logs
    const pageIds = consoleLogs
      .filter((l) => l.includes('page '))
      .map((l) => l.replace('page ', ''))

    console.log('Page IDs logged:', pageIds)

    // Check that we have at least one ID
    expect(pageIds.length, 'Should have at least one page ID logged').toBeGreaterThan(0)

    // The first ID should be SSR format
    const firstId = pageIds[0]
    expect(
      isSSRFormat(firstId),
      `First ID "${firstId}" should be SSR format (uppercase R)`
    ).toBe(true)

    // No ID should be client format - if any are, hydration was abandoned
    const clientIds = pageIds.filter(isClientFormat)
    expect(
      clientIds.length,
      `Found client-format IDs ${JSON.stringify(clientIds)} - hydration was abandoned!`
    ).toBe(0)

    // All IDs should be the same (re-renders are OK, but remounts are not)
    const uniqueIds = [...new Set(pageIds)]
    expect(
      uniqueIds.length,
      `ID changed during hydration: ${pageIds.join(' → ')} - component was remounted!`
    ).toBe(1)

    await page.close()
  })

  it('DOM data-testid should match React useId after hydration', async () => {
    const page = await browser.newPage()

    await page.goto(`${serverUrl}/`, { waitUntil: 'load' })
    await new Promise((r) => setTimeout(r, 3000))

    const result = await page.evaluate(() => {
      const el = document.getElementById('index-page')
      const domId = el?.getAttribute('data-testid') || ''
      const testData = (window as any).__hydrationTest
      const reactId = testData?.page?.current || ''
      return { domId, reactId }
    })

    console.log('DOM ID:', result.domId)
    console.log('React ID:', result.reactId)

    // DOM should match React's state
    expect(result.domId, 'DOM data-testid should match React useId').toBe(result.reactId)

    // Both should be SSR format
    expect(
      isSSRFormat(result.domId),
      `DOM ID "${result.domId}" should be SSR format`
    ).toBe(true)
    expect(
      isSSRFormat(result.reactId),
      `React ID "${result.reactId}" should be SSR format`
    ).toBe(true)

    await page.close()
  })
})
