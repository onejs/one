import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'

/**
 * Script Loading Tests
 *
 * Tests the experimental_scriptLoading: 'after-lcp' option which:
 * - Keeps modulepreload links so scripts download immediately in parallel
 * - Removes async script tags to prevent immediate execution
 * - Uses double rAF to execute scripts after first paint
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

describe('after-lcp script loading', () => {
  describe('HTML structure', () => {
    test('built HTML contains double-rAF loader script', async () => {
      const htmlPath = path.join(process.cwd(), 'dist/client/index.html')
      const html = fs.readFileSync(htmlPath, 'utf-8')

      // Should contain the double-rAF loader
      expect(html).toContain('requestAnimationFrame')
      expect(html).toContain('loadScripts')
    })

    test('built HTML does not contain async module scripts', async () => {
      const htmlPath = path.join(process.cwd(), 'dist/client/index.html')
      const html = fs.readFileSync(htmlPath, 'utf-8')

      // Should NOT contain async script tags (they should be removed)
      const asyncScriptMatch = html.match(/<script\s+type="module"[^>]*async[^>]*><\/script>/gi)
      expect(asyncScriptMatch).toBeNull()
    })

    test('built HTML keeps modulepreload links for parallel download', async () => {
      const htmlPath = path.join(process.cwd(), 'dist/client/index.html')
      const html = fs.readFileSync(htmlPath, 'utf-8')

      // Should contain modulepreload links (scripts download immediately)
      expect(html).toContain('rel="modulepreload"')
    })
  })

  describe('server-rendered content', () => {
    test('home page shows SSR content immediately', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl + '/', { waitUntil: 'domcontentloaded' })

      // SSR content should be visible immediately (before JS loads)
      expect(await page.textContent('#page-title')).toBe('Home Page')
      expect(await page.textContent('#ssr-content')).toBe('This content is server-rendered')

      await page.close()
    })

    test('other page shows SSR content immediately', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl + '/other', { waitUntil: 'domcontentloaded' })

      expect(await page.textContent('#page-title')).toBe('Other Page')
      expect(await page.textContent('#ssr-content')).toBe('This is the other page')

      await page.close()
    })
  })

  describe('hydration and interactivity', () => {
    test('home page hydrates and responds to clicks', async () => {
      const page = await context.newPage()

      // Listen for any JS errors
      const errors: string[] = []
      page.on('pageerror', (error) => {
        errors.push(error.message)
      })

      await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })

      // Initial state
      expect(await page.textContent('#count-display')).toBe('Count: 0')

      // Click should update state (React is hydrated)
      await page.click('#increment-btn')

      // Wait for React to hydrate and update
      await page.waitForFunction(
        () => document.querySelector('#count-display')?.textContent === 'Count: 1',
        { timeout: 5000 }
      )

      expect(await page.textContent('#count-display')).toBe('Count: 1')

      // No JS errors should have occurred
      expect(errors).toEqual([])

      await page.close()
    })

    test('other page hydrates and responds to clicks', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl + '/other', { waitUntil: 'networkidle' })

      // Initial state
      expect(await page.textContent('#message-display')).toBe('Not clicked')

      // Click should update state
      await page.click('#click-btn')

      await page.waitForFunction(
        () => document.querySelector('#message-display')?.textContent === 'Clicked!',
        { timeout: 5000 }
      )

      expect(await page.textContent('#message-display')).toBe('Clicked!')

      await page.close()
    })
  })

  describe('client-side navigation', () => {
    test('can navigate between pages and interact', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })

      // Verify we're on home
      expect(await page.textContent('#page-title')).toBe('Home Page')

      // Navigate via client-side link
      await page.click('#nav-to-other')
      await page.waitForURL(serverUrl + '/other')

      // Verify navigation worked
      expect(await page.textContent('#page-title')).toBe('Other Page')

      // Interact with the other page
      await page.click('#click-btn')
      await page.waitForFunction(
        () => document.querySelector('#message-display')?.textContent === 'Clicked!',
        { timeout: 5000 }
      )

      expect(await page.textContent('#message-display')).toBe('Clicked!')

      await page.close()
    })
  })
})
