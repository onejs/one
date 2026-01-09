import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { type Browser, type BrowserContext, chromium } from 'playwright'
import {
  cleanupCreatedFiles,
  createRouteFile,
  renameRouteFile,
  deleteRouteFile,
  specificRouteContent,
  anotherRouteContent,
} from './utils'

const serverUrl = process.env.ONE_SERVER_URL

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  cleanupCreatedFiles()
  browser = await chromium.launch({ headless: !process.env.DEBUG })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

afterEach(async () => {
  cleanupCreatedFiles()
})

/**
 * Test: Adding a static route should take precedence over dynamic [slug] route
 *
 * Before: /specific -> matches [slug].tsx (shows "Dynamic: specific")
 * After adding specific.tsx: /specific -> matches specific.tsx (shows "Specific Page")
 */
test(
  'adding static route takes precedence over dynamic [slug]',
  { retry: 3 },
  async () => {
    const page = await context.newPage()

    // First verify that /specific currently goes to the dynamic route
    await page.goto(serverUrl + '/specific')
    const routeType = await page.getByTestId('route-type')
    expect(await routeType.textContent()).toBe('dynamic')

    // Now create a specific.tsx file
    createRouteFile('specific.tsx', specificRouteContent)

    // Wait for the dev server to pick up the change and reload
    // We need to navigate again or wait for HMR
    await page.waitForTimeout(500) // Give file watcher time to detect

    // Reload the page to get the new route
    await page.reload()

    // Wait for the static route to be active
    try {
      await page.waitForFunction(
        () => {
          const element = document.querySelector('[data-testid="route-type"]')
          return element && element.textContent?.trim() === 'static'
        },
        { timeout: 10000 }
      )
    } catch (e) {
      if (e instanceof Error) {
        e.message = `Static route did not take precedence over dynamic route: ${e.message}`
      }
      throw e
    }

    expect(await routeType.textContent()).toBe('static')
    const pageTitle = await page.getByTestId('page-title')
    expect(await pageTitle.textContent()).toBe('Specific Page')

    await page.close()
  }
)

/**
 * Test: Renaming a route file should update routing
 *
 * Create specific.tsx, then rename to another.tsx
 * /specific should go back to dynamic, /another should be static
 */
test('renaming route file updates routing correctly', { retry: 3 }, async () => {
  const page = await context.newPage()

  // Create specific.tsx first
  createRouteFile('specific.tsx', specificRouteContent)
  await page.waitForTimeout(500)

  // Verify /specific goes to static route
  await page.goto(serverUrl + '/specific')
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-testid="route-type"]')
      return element && element.textContent?.trim() === 'static'
    },
    { timeout: 10000 }
  )
  expect(await page.getByTestId('route-type').textContent()).toBe('static')

  // Now rename specific.tsx to another.tsx
  renameRouteFile('specific.tsx', 'another.tsx')
  await page.waitForTimeout(500)

  // /specific should now go to dynamic route again
  await page.goto(serverUrl + '/specific')
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-testid="route-type"]')
      return element && element.textContent?.trim() === 'dynamic'
    },
    { timeout: 10000 }
  )
  expect(await page.getByTestId('route-type').textContent()).toBe('dynamic')

  // /another should go to static route
  await page.goto(serverUrl + '/another')
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-testid="route-type"]')
      return element && element.textContent?.trim() === 'static'
    },
    { timeout: 10000 }
  )
  expect(await page.getByTestId('route-type').textContent()).toBe('static')

  await page.close()
})

/**
 * Test: Deleting a static route should fall back to dynamic [slug] route
 */
test('deleting static route falls back to dynamic [slug]', { retry: 3 }, async () => {
  const page = await context.newPage()

  // Create specific.tsx
  createRouteFile('specific.tsx', specificRouteContent)
  await page.waitForTimeout(500)

  // Verify /specific goes to static route
  await page.goto(serverUrl + '/specific')
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-testid="route-type"]')
      return element && element.textContent?.trim() === 'static'
    },
    { timeout: 10000 }
  )
  expect(await page.getByTestId('route-type').textContent()).toBe('static')

  // Delete specific.tsx
  deleteRouteFile('specific.tsx')
  await page.waitForTimeout(500)

  // /specific should now go to dynamic route
  await page.reload()
  await page.waitForFunction(
    () => {
      const element = document.querySelector('[data-testid="route-type"]')
      return element && element.textContent?.trim() === 'dynamic'
    },
    { timeout: 10000 }
  )
  expect(await page.getByTestId('route-type').textContent()).toBe('dynamic')

  await page.close()
})
