import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest'

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

describe(`Routing Tests`, () => {
  describe('Basic routing', { retry: 1 }, () => {
    it('should render the home page', async () => {
      const response = await fetch(serverUrl)
      const html = await response.text()

      expect(html).toContain('Welcome to One')
    })

    it('should return 200 status for the home page', async () => {
      const response = await fetch(serverUrl)
      expect(response.status).toBe(200)
    })

    // TODO re-enable
    // it('should render the SSR page', async () => {
    //   const response = await fetch(`${serverUrl}/ssr/basic`)
    //   const html = await response.text()

    //   expect(html).toContain('This is a basic SSR page')
    // })

    // it('should return 200 status for the SSR page', async () => {
    //   const response = await fetch(`${serverUrl}/ssr/basic`)
    //   expect(response.status).toBe(200)
    // })

    it('should handle not found routes', async () => {
      const response = await fetch(`${serverUrl}/not-found/non-existent-route`)
      const html = await response.text()

      expect(html).toContain('Custom 404: Page not found')
    })

    it('should handle deep not found routes', async () => {
      const response = await fetch(`${serverUrl}/not-found/deep/non-existent-route`)
      const html = await response.text()

      expect(html).toContain('Custom Deep 404: Page not found')
    })

    it('should handle not found routes with fallback', async () => {
      const response = await fetch(`${serverUrl}/not-found/fallback/non-existent-route`)
      const html = await response.text()

      expect(html).toContain('Custom 404: Page not found')
    })

    it('should return 404 status for non-existent routes', async () => {
      const response = await fetch(`${serverUrl}/not-found/non-existent-route`)
      expect(response.status).toBe(404)
    })

    it('should render page from inside a group', async () => {
      const response = await fetch(`${serverUrl}/about`)
      const html = await response.text()
      expect(html).toContain('About Our Company')
    })

    it('should render page from subdir when parent group name is the same', async () => {
      const response = await fetch(`${serverUrl}/blog/my-first-post`)
      const html = await response.text()
      expect(html).toContain('My First Post')
    })
  })

  describe(`SPA routing`, () => {
    it(`Dynamic SPA pages should work`, async () => {
      const page = await context.newPage()

      await page.goto(`${serverUrl}/spa/dynamic-1`)

      expect(await page.textContent('#spa-page')).toContain(`dynamic-1`)

      await page.goto(`${serverUrl}/spa/hello-world`)

      expect(await page.textContent('#spa-page')).toContain(`hello-world`)

      await page.close()
    })
  })
})
