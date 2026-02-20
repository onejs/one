import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

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

describe('Dynamic route 404 handling', () => {
  it('should render home page', async () => {
    const page = await context.newPage()
    try {
      await page.goto(serverUrl, { waitUntil: 'domcontentloaded' })
      await page.waitForSelector('#home', { timeout: 5000 })
    } finally {
      await page.close()
    }
  })

  // case1: single dynamic param, NO +not-found
  describe('case1: single dynamic, no +not-found', () => {
    it('should render page with param', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case1/value1`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case1-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case1-param1')).toBe('value1')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid nested path', async () => {
      const response = await fetch(`${serverUrl}/case1/value1/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show root 404 content for invalid nested path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case1/value1/invalid`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#root-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })

    it('should show root 404 on client-side navigation to invalid path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case1/value1`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case1-page', { timeout: 5000 })
        await page.evaluate(() => {
          window.location.href = '/case1/value1/invalid'
        })
        await page.waitForSelector('#root-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case2: single dynamic param, HAS +not-found
  describe('case2: single dynamic, has +not-found', () => {
    it('should render page with param', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case2/value2`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case2-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case2-param1')).toBe('value2')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid nested path', async () => {
      const response = await fetch(`${serverUrl}/case2/value2/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show custom 404 on client-side navigation', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case2/value2`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case2-page', { timeout: 5000 })
        await page.evaluate(() => {
          window.location.href = '/case2/value2/invalid'
        })
        await page.waitForSelector('#case2-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case3: nested dynamic params, NO +not-found
  describe('case3: nested dynamic, no +not-found', () => {
    it('should render page with both params', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case3/p1/p2`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case3-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case3-param1')).toBe('p1')
        expect(await page.textContent('#case3-param2')).toBe('p2')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid nested path', async () => {
      const response = await fetch(`${serverUrl}/case3/p1/p2/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show root 404 content for invalid nested path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case3/p1/p2/invalid`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#root-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case4: nested dynamic, +not-found at middle level
  describe('case4: nested dynamic, +not-found at middle', () => {
    it('should render page with both params', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case4/p1/p2`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case4-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case4-param1')).toBe('p1')
        expect(await page.textContent('#case4-param2')).toBe('p2')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid path', async () => {
      const response = await fetch(`${serverUrl}/case4/p1/p2/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show middle-level 404 content for invalid path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case4/p1/p2/invalid`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case4-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case5: deeply nested, +not-found at leaf
  describe('case5: deeply nested, +not-found at leaf', () => {
    it('should render page with all params', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case5/p1/p2/p3`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case5-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case5-param1')).toBe('p1')
        expect(await page.textContent('#case5-param2')).toBe('p2')
        expect(await page.textContent('#case5-param3')).toBe('p3')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid path', async () => {
      const response = await fetch(`${serverUrl}/case5/p1/p2/p3/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show leaf-level 404 content for invalid path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case5/p1/p2/p3/invalid`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case5-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case6: dynamic then static, NO +not-found
  describe('case6: dynamic/static, no +not-found', () => {
    it('should render page', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case6/val/segment`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case6-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case6-param1')).toBe('val')
      } finally {
        await page.close()
      }
    })
  })

  // case7: static then dynamic, HAS +not-found
  describe('case7: static/dynamic, has +not-found', () => {
    it('should render page', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case7/prefix/val`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case7-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case7-param1')).toBe('val')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid path', async () => {
      const response = await fetch(`${serverUrl}/case7/prefix/val/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show custom 404 content for invalid path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case7/prefix/val/invalid`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case7-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case8: dynamic/static/dynamic, +not-found at first dynamic
  describe('case8: dynamic/static/dynamic, +not-found at first', () => {
    it('should render page', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case8/p1/mid/p2`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case8-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case8-param1')).toBe('p1')
        expect(await page.textContent('#case8-param2')).toBe('p2')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for invalid path', async () => {
      const response = await fetch(`${serverUrl}/case8/p1/invalid`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show first-level 404 content for invalid path', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case8/p1/invalid`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case8-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })
  })

  // case9: loader that throws ENOENT for invalid slugs (like MDX loading)
  describe('case9: loader ENOENT handling', () => {
    it('should render page with valid slug', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case9/valid`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case9-page', { timeout: 5000, state: 'visible' })
        expect(await page.textContent('#case9-slug')).toBe('valid')
      } finally {
        await page.close()
      }
    })

    it('should return 404 for slug where loader throws ENOENT', async () => {
      const response = await fetch(`${serverUrl}/case9/nonexistent`)
      if (isProd) {
        expect(response.status).toBe(404)
      }
    })

    it('should show 404 page for slug where loader throws ENOENT', async () => {
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/case9/nonexistent`, {
          waitUntil: 'domcontentloaded',
        })
        await page.waitForSelector('#case9-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })

    it('should handle client-side navigation to invalid slug gracefully', async () => {
      const page = await context.newPage()
      try {
        // start on valid page
        await page.goto(`${serverUrl}/case9/valid`, { waitUntil: 'domcontentloaded' })
        await page.waitForSelector('#case9-page', { timeout: 5000 })

        // navigate to invalid slug via client-side navigation
        await page.evaluate(() => {
          window.location.href = '/case9/nonexistent'
        })

        // should show 404 page without freezing (within 5 seconds)
        await page.waitForSelector('#case9-not-found', { timeout: 5000 })
      } finally {
        await page.close()
      }
    })

    it('should return 404 signal in loader response for invalid slug', async () => {
      const response = await fetch(
        `${serverUrl}/case9/nonexistent/_vxrn_loader.js?v=${Date.now()}`
      )
      const text = await response.text()
      // should return valid JS with __oneError: 404
      expect(text).toContain('__oneError')
      expect(text).toContain('404')
    })
  })
})
