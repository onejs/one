import { type Browser, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, test } from 'vitest'

/**
 * Vite's experimental full-bundle dev mode (`web.experimentalBundledDev`).
 *
 * This serves the client as a single rolldown bundle instead of per-module ESM,
 * which is a different dev pipeline from every other test in the suite. It
 * regressed silently on the vite 8.1 -> 8.2 upgrade: 8.2 moved the bundled-dev
 * client out of the entry bundle into a standalone /bundledDevClient.mjs that
 * defines __rolldown_runtime__, and without it the entry threw
 * "__rolldown_runtime__ is not defined" and the page never hydrated while still
 * serving a 200 with correct-looking SSR html.
 */

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

let browser: Browser

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
})

afterAll(async () => {
  await browser.close()
})

describe('bundled dev mode', () => {
  test('hydrates and stays interactive with no page errors', async () => {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
    page.on('console', (m) => {
      if (m.type() === 'error') errors.push(m.text())
    })

    await page.goto(`${serverUrl}/`, { waitUntil: 'networkidle' })

    expect(await page.textContent('#heading')).toBe('bundled dev')

    // react only attaches fiber keys to dom nodes on the client, so this fails
    // if the bundle never ran even though the ssr markup looks right
    const hydrated = await page.evaluate(() => {
      for (const el of document.querySelectorAll('*')) {
        if (Object.keys(el).some((k) => k.startsWith('__reactFiber$'))) return true
      }
      return false
    })
    expect(hydrated).toBe(true)

    // and prove the handler is live, not just that react mounted
    await page.click('#counter')
    expect(await page.textContent('#counter')).toBe('count: 1')

    expect(errors).toEqual([])

    await page.close()
  })
})
