import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * Test to verify that navigating between pages that share a layout
 * does NOT cause the layout to remount.
 *
 * The test navigates:
 * /docs-home -> /docs/page-1 -> /docs/page-2 -> /docs/page-3
 *
 * The docs layout should mount once when entering /docs/page-1
 * and should NOT remount when navigating to page-2 or page-3.
 */

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: true })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

describe('Layout Navigation Stability', () => {
  it('should not remount layout when navigating between pages in same layout', async () => {
    const page = await context.newPage()

    // Enable console logging for debug
    if (isDebug || process.env.ONE_DEBUG_ROUTER) {
      page.on('console', (msg) => {
        const text = msg.text()
        if (
          text.includes('[DocsNavTestLayout]') ||
          text.includes('[one]') ||
          text.includes('route key') ||
          text.includes('descriptor') ||
          text.includes('routeInfo') ||
          text.startsWith('  ')
        ) {
          console.log(`BROWSER: ${text}`)
        }
      })
    }

    // Start from docs-home (outside the docs layout)
    console.log('\n=== Starting from /docs-home ===')
    await page.goto(`${serverUrl}/docs-home`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500)

    // Get initial state - layout should NOT be mounted yet
    const initialState = await page.evaluate(() => {
      const w = window as any
      return {
        mountCount: w.__docsLayoutMountCount || 0,
        unmountCount: w.__docsLayoutUnmountCount || 0,
      }
    })
    console.log('Initial state at /docs-home:')
    console.log('  Mount count:', initialState.mountCount)
    expect(initialState.mountCount).toBe(0) // Layout not mounted yet

    // Navigate to first docs page - this WILL mount the layout (expected)
    console.log('\n=== Clicking link to /docs/page-1 ===')
    await page.click('#link-to-docs-page-1')
    await page.waitForURL('**/docs/page-1')
    await page.waitForTimeout(500)

    const stateAfterFirst = await page.evaluate(() => {
      const w = window as any
      return {
        mountCount: w.__docsLayoutMountCount || 0,
        unmountCount: w.__docsLayoutUnmountCount || 0,
      }
    })
    console.log('After entering docs layout (to /docs/page-1):')
    console.log('  Mount count:', stateAfterFirst.mountCount)
    console.log('  Unmount count:', stateAfterFirst.unmountCount)

    // Layout should be mounted now (may be 1 or 2 due to StrictMode)
    expect(stateAfterFirst.mountCount).toBeGreaterThan(0)

    // Record the mount count after entering the layout
    const mountCountAfterEntry = stateAfterFirst.mountCount

    // Navigate to second docs page - layout should NOT remount
    console.log('\n=== Clicking link to /docs/page-2 ===')
    await page.click('a[href="/docs/page-2"]')
    await page.waitForURL('**/docs/page-2')
    await page.waitForTimeout(500)

    const stateAfterSecond = await page.evaluate(() => {
      const w = window as any
      return {
        mountCount: w.__docsLayoutMountCount || 0,
        unmountCount: w.__docsLayoutUnmountCount || 0,
      }
    })
    console.log('After navigation within layout (to /docs/page-2):')
    console.log('  Mount count:', stateAfterSecond.mountCount)
    console.log('  Unmount count:', stateAfterSecond.unmountCount)

    // CRITICAL: Mount count should NOT increase when navigating within layout
    expect(stateAfterSecond.mountCount).toBe(mountCountAfterEntry)

    // Navigate to third docs page - layout should still NOT remount
    console.log('\n=== Clicking link to /docs/page-3 ===')
    await page.click('a[href="/docs/page-3"]')
    await page.waitForURL('**/docs/page-3')
    await page.waitForTimeout(500)

    const stateAfterThird = await page.evaluate(() => {
      const w = window as any
      return {
        mountCount: w.__docsLayoutMountCount || 0,
        unmountCount: w.__docsLayoutUnmountCount || 0,
      }
    })
    console.log('After second navigation within layout (to /docs/page-3):')
    console.log('  Mount count:', stateAfterThird.mountCount)
    console.log('  Unmount count:', stateAfterThird.unmountCount)

    // CRITICAL: Mount count should STILL not increase
    expect(stateAfterThird.mountCount).toBe(mountCountAfterEntry)

    console.log('\n✓ Layout stability verified - no remounts during navigation within layout')

    await page.close()
  })
})
