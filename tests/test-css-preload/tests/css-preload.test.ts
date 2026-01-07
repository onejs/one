import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * CSS Preload Tests
 *
 * Verifies that CSS is properly loaded during client-side navigation.
 * The _preload_css.js files should inject missing CSS links into the document
 * before navigation completes.
 */

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

// Helper to get all stylesheet links in document
async function getStylesheetLinks(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .map((link) => link.getAttribute('href'))
        .filter(Boolean) as string[]
  )
}

// Helper to get computed color of an element
async function getElementColor(page: Page, selector: string): Promise<string> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel)
    if (!el) return ''
    return getComputedStyle(el).color
  }, selector)
}

describe('CSS Preload - Styles Load During Client Navigation', () => {
  // home.css sets #page-title to blue (rgb(0, 0, 255))
  // other.css sets #page-title to red (rgb(255, 0, 0))

  test('/other => / - CSS loads for home page after navigation', async () => {
    const page = await context.newPage()

    // Start at /other - should have red title
    await page.goto(serverUrl + '/other', { waitUntil: 'networkidle' })
    expect(await page.textContent('#page-title')).toContain('Other Page')

    const otherColor = await getElementColor(page, '#page-title')
    expect(otherColor, 'Other page title should be red').toBe('rgb(255, 0, 0)')

    // Navigate to home via client-side navigation
    await page.click('#nav-to-home')
    await page.waitForURL(serverUrl + '/')
    await page.waitForLoadState('networkidle')

    // Home page CSS should be loaded and applied - title should be blue
    const homeColor = await getElementColor(page, '#page-title')
    expect(homeColor, 'Home page title should be blue after navigation').toBe(
      'rgb(0, 0, 255)'
    )

    await page.close()
  })

  test('/ => /other - CSS loads for other page after navigation', async () => {
    const page = await context.newPage()

    // Start at home - should have blue title
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    expect(await page.textContent('#page-title')).toContain('Home Page')

    const homeColor = await getElementColor(page, '#page-title')
    expect(homeColor, 'Home page title should be blue').toBe('rgb(0, 0, 255)')

    // Navigate to other via client-side navigation
    await page.click('#nav-to-other')
    await page.waitForURL(serverUrl + '/other')
    await page.waitForLoadState('networkidle')

    // Other page CSS should be loaded and applied - title should be red
    const otherColor = await getElementColor(page, '#page-title')
    expect(otherColor, 'Other page title should be red after navigation').toBe(
      'rgb(255, 0, 0)'
    )

    await page.close()
  })

  test('round-trip navigation applies correct CSS each time', async () => {
    const page = await context.newPage()

    // Start at home - blue
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })
    expect(await getElementColor(page, '#page-title')).toBe('rgb(0, 0, 255)')

    // Navigate to other - should be red
    await page.click('#nav-to-other')
    await page.waitForURL(serverUrl + '/other')
    await page.waitForLoadState('networkidle')
    expect(await getElementColor(page, '#page-title')).toBe('rgb(255, 0, 0)')

    // Navigate back to home - should be blue again
    await page.click('#nav-to-home')
    await page.waitForURL(serverUrl + '/')
    await page.waitForLoadState('networkidle')
    expect(await getElementColor(page, '#page-title')).toBe('rgb(0, 0, 255)')

    await page.close()
  })

  test('CSS links are not duplicated after multiple navigations', async () => {
    const page = await context.newPage()

    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })

    // Navigate back and forth multiple times
    for (let i = 0; i < 3; i++) {
      await page.click('#nav-to-other')
      await page.waitForURL(serverUrl + '/other')
      await page.waitForLoadState('networkidle')

      await page.click('#nav-to-home')
      await page.waitForURL(serverUrl + '/')
      await page.waitForLoadState('networkidle')
    }

    const finalCSS = await getStylesheetLinks(page)

    // Each CSS file should appear at most once
    const counts = new Map<string, number>()
    for (const css of finalCSS) {
      counts.set(css, (counts.get(css) || 0) + 1)
    }

    for (const [css, count] of counts) {
      expect(count, `CSS file ${css} should not be duplicated`).toBe(1)
    }

    await page.close()
  })
})
