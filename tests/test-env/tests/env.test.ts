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
      expect(html).toMatch(/<div[^>]*id="process-env"[^>]*>ssr<\/div>/)
    })

    it('should have import.meta.env.VITE_ENVIRONMENT in SSR HTML', async () => {
      const response = await fetch(serverUrl)
      const html = await response.text()
      expect(html).toMatch(/<div[^>]*id="import-meta"[^>]*>ssr<\/div>/)
    })

    it('should have VITE_ENVIRONMENT from shared module in SSR HTML', async () => {
      const response = await fetch(serverUrl)
      const html = await response.text()
      // shared module imported by both client and server must resolve correctly
      expect(html).toMatch(/<div[^>]*id="shared-module"[^>]*>ssr<\/div>/)
    })
  })

  describe('Server middleware (shared module)', () => {
    it('should have correct VITE_ENVIRONMENT in middleware via shared module', async () => {
      // regression: rolldown replaces process.env.VITE_ENVIRONMENT with undefined
      // in shared modules at transform time before runtime setServerGlobals() runs
      const response = await fetch(`${serverUrl}/test-env-middleware`)
      expect(response.status).toBe(200)
      const data = await response.json()
      expect(data.viteEnvironment).toBe('ssr')
    })
  })

  describe('Client (after hydration)', () => {
    it('should show process.env.VITE_ENVIRONMENT after hydration', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl, { waitUntil: 'networkidle' })

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

    it('should show VITE_ENVIRONMENT from shared module after hydration', async () => {
      const page = await context.newPage()
      await page.goto(serverUrl, { waitUntil: 'networkidle' })

      try {
        await page.waitForFunction(
          () => document.querySelector('#shared-module')?.textContent === 'client',
          { timeout: 15000 }
        )
      } catch (e) {
        const text = await page.textContent('#shared-module')
        throw new Error(`Hydration timeout - expected 'client' but got '${text}'`)
      }

      const text = await page.textContent('#shared-module')
      expect(text).toBe('client')

      await page.close()
    })
  })
})
