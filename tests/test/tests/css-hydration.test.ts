import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

/**
 * CSS Hydration Tests
 *
 * Tests that CSS elements (both <link> and <style>) render consistently
 * between server and client to avoid hydration mismatches.
 *
 * The key issue: when inlineLayoutCSS is enabled, the server renders <style> tags
 * but the client context strips cssContents (to avoid 100KB+ JSON payload),
 * causing the client to try to render <link> tags instead = hydration mismatch.
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

describe('CSS Hydration Tests', () => {
  it('should not have hydration mismatch warnings for CSS elements', async () => {
    const page = await context.newPage()

    const hydrationWarnings: string[] = []

    // Listen for console warnings about hydration
    page.on('console', (msg) => {
      const text = msg.text()
      // React hydration warnings contain these phrases
      if (
        text.includes('Hydration') ||
        text.includes('hydration') ||
        text.includes('did not match') ||
        text.includes('server rendered') ||
        text.includes('Expected server HTML')
      ) {
        hydrationWarnings.push(text)
      }
    })

    // Also capture errors
    page.on('pageerror', (error) => {
      if (error.message.includes('Hydration') || error.message.includes('hydration')) {
        hydrationWarnings.push(error.message)
      }
    })

    // Load the main page and wait for hydration to complete
    await page.goto(serverUrl!, { waitUntil: 'networkidle' })

    // Give React a moment to report any hydration issues
    await page.waitForTimeout(1000)

    // Check that there are no hydration warnings related to CSS
    const cssHydrationWarnings = hydrationWarnings.filter(
      (w) =>
        w.includes('style') ||
        w.includes('Style') ||
        w.includes('link') ||
        w.includes('Link') ||
        w.includes('css') ||
        w.includes('CSS')
    )

    expect(
      cssHydrationWarnings,
      `Found CSS-related hydration warnings:\n${cssHydrationWarnings.join('\n')}`
    ).toHaveLength(0)

    await page.close()
  })

  it('should have matching CSS element count between server HTML and hydrated DOM', async () => {
    // First, fetch the raw HTML from server
    const response = await fetch(serverUrl!)
    const html = await response.text()

    // Count CSS elements in server HTML
    const serverStyleCount = (html.match(/<style[^>]*>/g) || []).length
    const serverLinkStylesheetCount = (
      html.match(/<link[^>]*rel=["']stylesheet["'][^>]*>/g) || []
    ).length

    // Now load in browser and count after hydration
    const page = await context.newPage()
    await page.goto(serverUrl!, { waitUntil: 'networkidle' })
    await page.waitForTimeout(500) // Wait for hydration

    const clientCounts = await page.evaluate(() => {
      return {
        styleCount: document.querySelectorAll('head style').length,
        linkStylesheetCount: document.querySelectorAll('head link[rel="stylesheet"]')
          .length,
      }
    })

    // The counts should match (allowing for dynamic CSS that might be added)
    // At minimum, we shouldn't have FEWER CSS elements after hydration
    expect(
      clientCounts.styleCount,
      `Style count mismatch: server=${serverStyleCount}, client=${clientCounts.styleCount}`
    ).toBeGreaterThanOrEqual(serverStyleCount)

    expect(
      clientCounts.linkStylesheetCount,
      `Link stylesheet count mismatch: server=${serverLinkStylesheetCount}, client=${clientCounts.linkStylesheetCount}`
    ).toBeGreaterThanOrEqual(serverLinkStylesheetCount)

    await page.close()
  })

  it('should preserve inline CSS content after full hydration', async () => {
    const page = await context.newPage()

    // First get the SSR HTML to capture original CSS content
    const response = await fetch(serverUrl!)
    const html = await response.text()

    // Extract CSS content from __one_css_* style tags in SSR HTML
    const ssrCSSRegex = /<style[^>]*id="__one_css_(\d+)"[^>]*>([\s\S]*?)<\/style>/g
    const ssrCSSContents: Record<string, string> = {}
    let match
    while ((match = ssrCSSRegex.exec(html)) !== null) {
      ssrCSSContents[`__one_css_${match[1]}`] = match[2]
    }

    // Now load the page and wait for full hydration
    await page.goto(serverUrl!, { waitUntil: 'networkidle' })

    // Wait for React to fully hydrate (look for hydration complete signals)
    await page.waitForTimeout(2000) // Give React time to hydrate

    // Verify __one_css_* style elements still have their original content
    const clientCSSContents = await page.evaluate(() => {
      const styles = document.querySelectorAll<HTMLStyleElement>(
        'style[id^="__one_css_"]'
      )
      const result: Record<
        string,
        { hasContent: boolean; contentLength: number; content: string }
      > = {}
      styles.forEach((style) => {
        result[style.id] = {
          hasContent: style.innerHTML.trim().length > 0,
          contentLength: style.innerHTML.length,
          content: style.innerHTML.slice(0, 100), // First 100 chars for debugging
        }
      })
      return result
    })

    // If we had SSR CSS, verify it persisted
    const ssrCSSIds = Object.keys(ssrCSSContents)
    if (ssrCSSIds.length > 0) {
      for (const id of ssrCSSIds) {
        const clientStyle = clientCSSContents[id]
        expect(clientStyle, `Style ${id} should exist after hydration`).toBeDefined()
        expect(
          clientStyle?.hasContent,
          `Style ${id} should have content after hydration (got ${clientStyle?.contentLength} chars)`
        ).toBe(true)
        expect(
          clientStyle?.contentLength,
          `Style ${id} content length should match SSR (SSR: ${ssrCSSContents[id].length}, client: ${clientStyle?.contentLength})`
        ).toBe(ssrCSSContents[id].length)
      }
    }

    await page.close()
  })
})
