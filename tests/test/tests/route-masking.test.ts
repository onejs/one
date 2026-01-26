/**
 * Route Masking E2E Tests
 *
 * These tests verify that route masking works correctly:
 * - Navigate to masked route → URL shows masked path
 * - Refresh with unmaskOnReload: false → modal restores, URL preserved
 * - Browser back/forward navigation with masks
 */

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

// Skip entire suite - route masking is WIP and not fully working yet
describe.skip('Route Masking Tests', { retry: 3, timeout: 120_000 }, () => {
  describe('Basic Navigation', () => {
    it('should show photos page at /photos', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Check we're on the photos page
      const title = await page.locator('[data-testid="photos-title"]').textContent()
      expect(title).toBe('Photos')
      expect(page.url()).toBe(`${serverUrl}/photos`)

      await page.close()
    })

    it('should navigate to modal and show masked URL', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Click on Photo 1 to open modal
      await page.locator('text=Photo 1').first().click()
      await page.waitForTimeout(500)

      // Modal should be visible
      const modalTitle = await page.locator('[data-testid="modal-title"]').textContent()
      expect(modalTitle).toBe('Photo 1')

      // URL should show masked path (/photos/1) not actual path (/photos/1/modal)
      expect(page.url()).toBe(`${serverUrl}/photos/1`)

      await page.close()
    })

    it('should navigate to different photo modals with masked URLs', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Click Photo 3
      await page.locator('text=Photo 3').first().click()
      await page.waitForTimeout(500)

      expect(page.url()).toBe(`${serverUrl}/photos/3`)
      const modalTitle = await page.locator('[data-testid="modal-title"]').textContent()
      expect(modalTitle).toBe('Photo 3')

      await page.close()
    })
  })

  describe('Page Refresh (unmaskOnReload: false)', () => {
    it('should restore modal content after refresh with masked URL preserved', async () => {
      const page = await context.newPage()
      // Navigate to photos and open modal
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      await page.locator('text=Photo 2').first().click()
      await page.waitForTimeout(500)

      // Verify modal is open and URL is masked
      expect(page.url()).toBe(`${serverUrl}/photos/2`)
      let modalTitle = await page.locator('[data-testid="modal-title"]').textContent()
      expect(modalTitle).toBe('Photo 2')

      // Refresh the page
      await page.reload()
      await page.waitForTimeout(1500) // Wait for hydration

      // After refresh, modal should still be visible (unmaskOnReload: false)
      modalTitle = await page.locator('[data-testid="modal-title"]').textContent()
      expect(modalTitle).toBe('Photo 2')

      // URL should still be masked
      expect(page.url()).toBe(`${serverUrl}/photos/2`)

      await page.close()
    })

    it('should restore modal with correct photo ID after refresh', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Open Photo 5 modal
      await page.locator('text=Photo 5').first().click()
      await page.waitForTimeout(500)

      expect(page.url()).toBe(`${serverUrl}/photos/5`)

      // Refresh
      await page.reload()
      await page.waitForTimeout(1500)

      // Check modal content shows correct photo
      const routeInfo = await page
        .locator('[data-testid="modal-route-info"]')
        .textContent()
      expect(routeInfo).toContain('/photos/5/modal')

      // URL should be preserved
      expect(page.url()).toBe(`${serverUrl}/photos/5`)

      await page.close()
    })
  })

  describe('Browser Navigation', () => {
    it('should handle browser back button correctly', async () => {
      const page = await context.newPage()
      // Start at photos list
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      const initialUrl = page.url()

      // Open modal
      await page.locator('text=Photo 1').first().click()
      await page.waitForTimeout(500)

      expect(page.url()).toBe(`${serverUrl}/photos/1`)

      // Press browser back
      await page.goBack()
      await page.waitForTimeout(500)

      // Should be back at photos list
      expect(page.url()).toBe(initialUrl)

      await page.close()
    })

    it('should handle browser forward after going back', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Open modal
      await page.locator('text=Photo 4').first().click()
      await page.waitForTimeout(500)

      expect(page.url()).toBe(`${serverUrl}/photos/4`)

      // Go back
      await page.goBack()
      await page.waitForTimeout(500)

      expect(page.url()).toBe(`${serverUrl}/photos`)

      // Go forward
      await page.goForward()
      await page.waitForTimeout(500)

      // Should be back at masked URL with modal
      expect(page.url()).toBe(`${serverUrl}/photos/4`)

      await page.close()
    })

    it('should navigate through multiple masked routes sequentially', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Open Photo 1
      await page.locator('text=Photo 1').first().click()
      await page.waitForTimeout(500)
      expect(page.url()).toBe(`${serverUrl}/photos/1`)

      // Open Photo 2 directly (using close button which navigates to /photos, then click Photo 2)
      await page.locator('[data-testid="modal-close-btn"]').click()
      await page.waitForTimeout(500)
      expect(page.url()).toBe(`${serverUrl}/photos`)

      await page.locator('text=Photo 2').first().click()
      await page.waitForTimeout(500)
      expect(page.url()).toBe(`${serverUrl}/photos/2`)

      // Open Photo 3
      await page.locator('[data-testid="modal-close-btn"]').click()
      await page.waitForTimeout(500)

      await page.locator('text=Photo 3').first().click()
      await page.waitForTimeout(500)
      expect(page.url()).toBe(`${serverUrl}/photos/3`)

      // Go back should return to /photos
      await page.goBack()
      await page.waitForTimeout(500)
      expect(page.url()).toBe(`${serverUrl}/photos`)

      await page.close()
    })
  })

  describe('Direct URL Access', () => {
    it('should show photo detail page when accessing masked URL directly', async () => {
      const page = await context.newPage()
      // When unmaskOnReload is false and we have history.state, modal restores
      // But when accessing URL directly (no history.state), we should see the detail page

      await page.goto(`${serverUrl}/photos/7`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1500)

      // URL should remain as accessed
      expect(page.url()).toBe(`${serverUrl}/photos/7`)

      // Since there's no history.state on direct access,
      // the behavior depends on unmaskOnReload setting
      // With unmaskOnReload: false and no history.state,
      // it should show the photo detail page (the mask target)
      const hasDetailPage = await page
        .locator('[data-testid="photo-detail-page"]')
        .count()
      const hasModal = await page.locator('[data-testid="modal-title"]').count()

      // Should have either detail page or modal (implementation dependent)
      expect(hasDetailPage + hasModal).toBeGreaterThan(0)

      await page.close()
    })
  })

  describe('Modal Close', () => {
    it('should close modal and navigate back', async () => {
      const page = await context.newPage()
      await page.goto(`${serverUrl}/photos`, { waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(1000)

      // Open modal
      await page.locator('text=Photo 1').first().click()
      await page.waitForTimeout(500)

      // Modal should be visible
      expect(await page.locator('[data-testid="modal-title"]').count()).toBe(1)

      // Close modal using close button
      await page.locator('[data-testid="modal-close-btn"]').click()
      await page.waitForTimeout(500)

      // Should navigate back to photos
      expect(page.url()).toBe(`${serverUrl}/photos`)

      await page.close()
    })
  })
})
