import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it, test } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL!
const isDebug = !!process.env.DEBUG
const isProd = process.env.TEST_ONLY === 'prod'

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
      const response = await fetch(serverUrl!)
      const html = await response.text()

      expect(html).toContain('Welcome to One')
    })

    it('should return 200 status for the home page', async () => {
      const response = await fetch(serverUrl!)
      expect(response.status).toBe(200)
    })

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

    // only runs in prod - dev mode doesn't pre-check generateStaticParams
    it.skipIf(!isProd)(
      'should return 404 for SSG dynamic routes with invalid slugs',
      async () => {
        // valid slugs defined in generateStaticParams should work
        const validResponse = await fetch(`${serverUrl}/ssg-not-found/valid-page`)
        expect(validResponse.status).toBe(200)
        const validHtml = await validResponse.text()
        // content may have React comment nodes between text, so check for both parts
        expect(validHtml).toContain('SSG Page:')
        expect(validHtml).toContain('valid-page')

        // invalid slug not in generateStaticParams should 404
        const invalidResponse = await fetch(`${serverUrl}/ssg-not-found/invalid-slug`)
        expect(invalidResponse.status).toBe(404)
        const invalidHtml = await invalidResponse.text()
        expect(invalidHtml).toContain('SSG 404: Page not found')
      }
    )

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

  describe('SSR routing', { retry: 2, timeout: 60_000 }, () => {
    it('should render static SSR page on direct hit', async () => {
      const response = await fetch(`${serverUrl}/ssr/basic`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('This is a basic SSR page')
    })

    it('should render dynamic SSR page with params on direct hit', async () => {
      const response = await fetch(`${serverUrl}/ssr/test-param-123`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('Param SSR')
      expect(html).toContain('test-param-123')
    })

    it('should navigate to SSR page client-side', async () => {
      const page = await context.newPage()
      try {
        // start from home
        await page.goto(serverUrl, { waitUntil: 'networkidle' })

        // navigate client-side to SSR page
        await page.evaluate(() => {
          window.location.href = '/ssr/basic'
        })
        await page.waitForURL('**/ssr/basic')
        await page.waitForSelector('text=This is a basic SSR page', { timeout: 30_000 })

        const content = await page.textContent('body')
        expect(content).toContain('This is a basic SSR page')
      } finally {
        await page.close()
      }
    })

    it('should navigate between SSR pages client-side preserving state', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/ssr/param-a`, { waitUntil: 'networkidle' })
        await page.waitForSelector('#param', { timeout: 30_000 })
        expect(await page.textContent('#param')).toContain('param-a')

        // navigate to another param
        await page.evaluate(() => {
          window.location.href = '/ssr/param-b'
        })
        await page.waitForURL('**/ssr/param-b')
        await page.waitForSelector('#param', { timeout: 30_000 })
        expect(await page.textContent('#param')).toContain('param-b')
      } finally {
        await page.close()
      }
    })
  })

  describe('SSG routing', { retry: 2, timeout: 60_000 }, () => {
    it('should render SSG page on direct hit', async () => {
      const response = await fetch(`${serverUrl}/docs/page-1`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('Docs Page 1')
    })

    it('should render multiple SSG pages', async () => {
      const page1 = await fetch(`${serverUrl}/docs/page-1`)
      const page2 = await fetch(`${serverUrl}/docs/page-2`)
      const page3 = await fetch(`${serverUrl}/docs/page-3`)

      expect(page1.status).toBe(200)
      expect(page2.status).toBe(200)
      expect(page3.status).toBe(200)

      expect(await page1.text()).toContain('Docs Page 1')
      expect(await page2.text()).toContain('Docs Page 2')
      expect(await page3.text()).toContain('Docs Page 3')
    })

    it('should navigate between SSG pages client-side', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/docs/page-1`, { waitUntil: 'networkidle' })
        await page.waitForSelector('#docs-page-1-marker', { timeout: 30_000 })

        // click link to page 2
        await page.click('text=Page 2')
        await page.waitForURL('**/docs/page-2')
        await page.waitForSelector('#docs-page-2-marker', { timeout: 30_000 })

        // click link to page 3
        await page.click('text=Page 3')
        await page.waitForURL('**/docs/page-3')
        await page.waitForSelector('#docs-page-3-marker', { timeout: 30_000 })
      } finally {
        await page.close()
      }
    })
  })

  describe('SPA routing', { retry: 3, timeout: 120_000 }, () => {
    it('should render SPA page on direct hit', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/spa/dynamic-1`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#spa-page', { timeout: 60_000, state: 'visible' })
        expect(await page.textContent('#spa-page')).toContain('dynamic-1')
      } finally {
        await page.close()
      }
    })

    it('should navigate between SPA pages', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/spa/dynamic-1`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#spa-page', { timeout: 60_000, state: 'visible' })
        expect(await page.textContent('#spa-page')).toContain('dynamic-1')

        // navigate using page.goto (simulating clicking a link)
        await page.goto(`${serverUrl}/spa/hello-world`)
        await page.waitForSelector('#spa-page', { timeout: 60_000, state: 'visible' })
        expect(await page.textContent('#spa-page')).toContain('hello-world')
      } finally {
        await page.close()
      }
    })

    it('should render static SPA page', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/spa/spapage`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#spa-page', { timeout: 60_000, state: 'visible' })
        // static spa page should render
        const content = await page.textContent('body')
        expect(content).toBeTruthy()
      } finally {
        await page.close()
      }
    })

    it('should render deeply nested SPA dynamic route on direct hit', async () => {
      const page = await context.newPage()
      try {
        // route: (app)/dashboard/(tabs)/feed/post/[postId]+spa.tsx
        // url: /dashboard/feed/post/test-post-123
        await page.goto(`${serverUrl}/dashboard/feed/post/test-post-123`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#nested-spa-post-page', {
          timeout: 60_000,
          state: 'visible',
        })
        expect(await page.textContent('#post-id')).toBe('test-post-123')
      } finally {
        await page.close()
      }
    })

    it('should render dynamic SPA route with param in dirname on direct hit', async () => {
      const page = await context.newPage()
      try {
        // route: servers/[serverId]/index+spa.tsx
        // url: /servers/tamagui (any slug should work)
        // tests that dynamic params in dirname are correctly converted to :param format
        await page.goto(`${serverUrl}/servers/tamagui`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#server-page', {
          timeout: 1000,
          state: 'visible',
        })
        expect(await page.textContent('#server-id')).toBe('tamagui')
      } finally {
        await page.close()
      }
    })
  })
})
