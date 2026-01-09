import { ONLY_TEST_PROD } from '@vxrn/test'
import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!
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

describe('Environment Variable Tests', () => {
  describe('SSR (raw HTML)', () => {
    it('should have process.env.VITE_ENVIRONMENT in SSR HTML', async () => {
      const response = await fetch(serverUrl)
      const html = await response.text()
      expect(html).toContain(`<div id="process-env">ssr</div>`)
    })

    it('should have import.meta.env.VITE_ENVIRONMENT in SSR HTML', async () => {
      const response = await fetch(serverUrl)
      const html = await response.text()
      expect(html).toContain(`<div id="import-meta">ssr</div>`)
    })
  })

  // TODO: Fix client hydration for env variables - values stay 'ssr' instead of changing to 'client'
  describe.skip('Client (after hydration)', () => {
    it('should show process.env.VITE_ENVIRONMENT after hydration', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl, { waitUntil: 'networkidle' })

      // Wait for hydration to update the value from 'ssr' to 'client'
      try {
        await page.waitForFunction(
          () => document.querySelector('#process-env')?.textContent === 'client',
          { timeout: 15000 }
        )
      } catch (e) {
        const text = await page.textContent('#process-env')
        throw new Error(`Hydration timeout - expected 'client' but got '${text}'`)
      }

      const text = await page.textContent('#process-env')
      expect(text).toBe('client')

      await page.close()
    })

    it('should show import.meta.env.VITE_ENVIRONMENT after hydration', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl, { waitUntil: 'networkidle' })

      // Wait for hydration to update the value from 'ssr' to 'client'
      try {
        await page.waitForFunction(
          () => document.querySelector('#import-meta')?.textContent === 'client',
          { timeout: 15000 }
        )
      } catch (e) {
        const text = await page.textContent('#import-meta')
        throw new Error(`Hydration timeout - expected 'client' but got '${text}'`)
      }

      const text = await page.textContent('#import-meta')
      expect(text).toBe('client')

      await page.close()
    })
  })
})
