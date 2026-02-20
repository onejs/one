import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

/**
 * CSS Merged Tests
 *
 * Verifies that when cssCodeSplit: false is set, the merged CSS file
 * is properly linked in the HTML output.
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

describe('CSS Merged - cssCodeSplit: false', () => {
  test('merged css file exists in dist', async () => {
    const assetsDir = join(import.meta.dirname, '../dist/client/assets')
    const files = readdirSync(assetsDir)

    // with cssCodeSplit: false, there should be a single style-*.css file
    const cssFiles = files.filter((f) => f.endsWith('.css'))
    expect(cssFiles.length).toBeGreaterThan(0)
  })

  test('merged css is linked in html', async () => {
    const htmlPath = join(import.meta.dirname, '../dist/client/index.html')
    const html = readFileSync(htmlPath, 'utf-8')

    // should have a stylesheet link
    expect(html).toMatch(/<link[^>]+rel=["']?stylesheet["']?[^>]*>|<style>/)
  })

  test('styles are applied on page load', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/', { waitUntil: 'networkidle' })

    // check that the title has the green color from styles.css
    const titleColor = await page.evaluate(() => {
      const el = document.querySelector('#page-title')
      return el ? getComputedStyle(el).color : ''
    })
    expect(titleColor).toBe('rgb(0, 128, 0)')

    // check that the box has orange background
    const boxBg = await page.evaluate(() => {
      const el = document.querySelector('#styled-box')
      return el ? getComputedStyle(el).backgroundColor : ''
    })
    expect(boxBg).toBe('rgb(255, 165, 0)')

    await page.close()
  })

  test('manifest contains style.css entry', async () => {
    const manifestPath = join(import.meta.dirname, '../dist/client/.vite/manifest.json')
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))

    // with cssCodeSplit: false, vite adds "style.css" key to manifest
    expect(manifest['style.css']).toBeDefined()
    expect(manifest['style.css'].file).toMatch(/\.css$/)
  })
})
