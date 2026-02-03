import { type Browser, type BrowserContext, type Page, chromium } from 'playwright'
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

describe('Intercepting Routes', () => {
  describe('Basic intercept behavior', { retry: 2, timeout: 60_000 }, () => {
    it('should render the list page on direct navigation', async () => {
      const response = await fetch(`${serverUrl}/intercept-test`)
      expect(response.status).toBe(200)
      const html = await response.text()
      expect(html).toContain('Items List')
      expect(html).toContain('intercept-test-index')
    })

    it('should render FULL PAGE on direct navigation to item', async () => {
      // Direct navigation (hard navigation) should show full page, NOT modal
      // Note: This is a SPA route so we need to use browser to check rendered content
      const page = await context.newPage()
      try {
        await page.goto(`${serverUrl}/intercept-test/items/1`, { waitUntil: 'networkidle' })

        // Should see full page, not modal
        await page.waitForSelector('[data-testid="item-detail-page"]', { timeout: 10_000 })
        const fullPageText = await page.textContent('[data-testid="full-page-indicator"]')
        expect(fullPageText).toContain('FULL PAGE')

        // Modal should NOT be visible
        const modalVisible = await page.isVisible('[data-testid="intercept-modal-overlay"]')
        expect(modalVisible).toBe(false)
      } finally {
        await page.close()
      }
    })

    it('should show modal on soft navigation (client-side link click)', async () => {
      const page = await context.newPage()
      try {
        // Start at the list page
        await page.goto(`${serverUrl}/intercept-test`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="intercept-test-index"]', { timeout: 10_000 })

        // Click an item link (soft navigation)
        await page.click('[data-testid="item-link-1"]')

        // Should see the modal (intercepting route)
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })
        await page.waitForSelector('[data-testid="modal-indicator"]', { timeout: 5_000 })

        // Modal content should be visible
        const modalTitle = await page.textContent('[data-testid="modal-title"]')
        expect(modalTitle).toContain('Item 1')
        expect(modalTitle).toContain('Modal')

        // URL should show the target path (not the intercept route path)
        expect(page.url()).toContain('/intercept-test/items/1')

        // Background list should still be visible
        const listVisible = await page.isVisible('[data-testid="intercept-test-index"]')
        expect(listVisible).toBe(true)
      } finally {
        await page.close()
      }
    })

    it('should show full page after refresh while on intercepted route', async () => {
      const page = await context.newPage()
      try {
        // Start at list and click to open modal
        await page.goto(`${serverUrl}/intercept-test`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="item-link-2"]', { timeout: 10_000 })
        await page.click('[data-testid="item-link-2"]')

        // Wait for modal to appear
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })

        // Refresh the page
        await page.reload({ waitUntil: 'networkidle' })

        // After refresh, should see FULL PAGE, not modal
        await page.waitForSelector('[data-testid="item-detail-page"]', { timeout: 10_000 })
        await page.waitForSelector('[data-testid="full-page-indicator"]', { timeout: 5_000 })

        // Modal should NOT be visible
        const modalVisible = await page.isVisible('[data-testid="intercept-modal-overlay"]')
        expect(modalVisible).toBe(false)

        // Should still be at the same URL
        expect(page.url()).toContain('/intercept-test/items/2')
      } finally {
        await page.close()
      }
    })

    it('should close modal and restore URL when clicking close button', async () => {
      const page = await context.newPage()
      try {
        // Start at list
        await page.goto(`${serverUrl}/intercept-test`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="item-link-1"]', { timeout: 10_000 })

        // Open modal
        await page.click('[data-testid="item-link-1"]')
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })

        // Verify modal is open
        expect(page.url()).toContain('/intercept-test/items/1')

        // Click close button
        await page.click('[data-testid="close-modal"]')

        // Wait for modal to close
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', {
          state: 'hidden',
          timeout: 5_000,
        })

        // URL should be restored to the list
        await page.waitForURL('**/intercept-test', { timeout: 5_000 })
        expect(page.url()).toContain('/intercept-test')
        expect(page.url()).not.toContain('/items/')

        // List should still be visible
        const listVisible = await page.isVisible('[data-testid="intercept-test-index"]')
        expect(listVisible).toBe(true)
      } finally {
        await page.close()
      }
    })

    it('should close modal when clicking overlay', async () => {
      const page = await context.newPage()
      try {
        // Start at list
        await page.goto(`${serverUrl}/intercept-test`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="item-link-3"]', { timeout: 10_000 })

        // Open modal
        await page.click('[data-testid="item-link-3"]')
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })

        // Click on the overlay (not the content)
        // Click at the edge of the viewport which should be on the overlay
        await page.click('[data-testid="intercept-modal-overlay"]', {
          position: { x: 10, y: 10 },
        })

        // Wait for modal to close
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', {
          state: 'hidden',
          timeout: 5_000,
        })

        // URL should be restored
        expect(page.url()).toContain('/intercept-test')
        expect(page.url()).not.toContain('/items/')
      } finally {
        await page.close()
      }
    })

    it('should handle browser back button from intercepted route', async () => {
      const page = await context.newPage()
      try {
        // Start at list
        await page.goto(`${serverUrl}/intercept-test`, { waitUntil: 'networkidle' })
        await page.waitForSelector('[data-testid="item-link-1"]', { timeout: 10_000 })

        // Open modal
        await page.click('[data-testid="item-link-1"]')
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })

        // Press browser back
        await page.goBack()

        // Modal should close
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', {
          state: 'hidden',
          timeout: 5_000,
        })

        // Should be back at list
        expect(page.url()).toContain('/intercept-test')
        expect(page.url()).not.toContain('/items/')
      } finally {
        await page.close()
      }
    })

    it('should maintain different modal states for different items', async () => {
      const page = await context.newPage()
      try {
        // Start at list
        await page.goto(`${serverUrl}/intercept-test`, { waitUntil: 'networkidle' })

        // Open item 1 modal
        await page.click('[data-testid="item-link-1"]')
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })
        let modalTitle = await page.textContent('[data-testid="modal-title"]')
        expect(modalTitle).toContain('Item 1')

        // Close modal
        await page.click('[data-testid="close-modal"]')
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', {
          state: 'hidden',
          timeout: 5_000,
        })

        // Open item 2 modal
        await page.click('[data-testid="item-link-2"]')
        await page.waitForSelector('[data-testid="intercept-modal-overlay"]', { timeout: 10_000 })
        modalTitle = await page.textContent('[data-testid="modal-title"]')
        expect(modalTitle).toContain('Item 2')

        // Verify URL changed
        expect(page.url()).toContain('/intercept-test/items/2')
      } finally {
        await page.close()
      }
    })
  })

  describe('URL shareability', { retry: 2, timeout: 60_000 }, () => {
    it('shared URL should show full page version', async () => {
      const page = await context.newPage()
      try {
        // Simulate sharing: directly navigate to the item URL
        await page.goto(`${serverUrl}/intercept-test/items/1`, { waitUntil: 'networkidle' })

        // Should see full page, not modal
        await page.waitForSelector('[data-testid="item-detail-page"]', { timeout: 10_000 })
        const fullPageIndicator = await page.textContent('[data-testid="full-page-indicator"]')
        expect(fullPageIndicator).toContain('FULL PAGE')

        // Modal should not exist
        const modalExists = await page.isVisible('[data-testid="intercept-modal-overlay"]')
        expect(modalExists).toBe(false)
      } finally {
        await page.close()
      }
    })
  })
})
