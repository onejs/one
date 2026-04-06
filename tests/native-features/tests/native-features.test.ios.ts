import { describe, test, expect, beforeAll, afterAll } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo, waitForDisplayed } from '@vxrn/test/utils/appium'
import {
  captureScreenshot,
  captureErrorScreenshot,
  waitForElement,
} from '../utils/screenshot'
import type { Browser } from 'webdriverio'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('@vxrn/native integration tests', () => {
  let driver: Browser

  beforeAll(
    async () => {
      driver = await createSession(getWebDriverConfig())
      // wait for the app to boot and render the home screen
      await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
      await captureScreenshot(driver, 'home-screen-loaded')
    },
    5 * 60 * 1000
  )

  afterAll(async () => {
    if (driver) {
      try {
        await driver.deleteSession()
      } catch {}
    }
  })

  // -- home screen --

  describe('Home Screen', () => {
    test('renders home screen with navigation links', sharedTestOptions, async () => {
      const title = await waitForElement(driver, 'home-title')
      expect(await title.getText()).toBe('@vxrn/native Test Suite')

      // verify all nav links exist
      const navLinks = [
        'nav-color-test',
        'nav-zoom-test',
        'nav-toolbar-test',
        'nav-menu-test',
        'nav-split-view-test',
      ]

      for (const linkId of navLinks) {
        const link = driver.$(`~${linkId}`)
        await link.waitForDisplayed({ timeout: 5000 })
        expect(await link.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'home-screen-nav-links')
    })
  })

  // -- color api --

  describe('Color API', () => {
    test('renders iOS system colors', sharedTestOptions, async () => {
      await navigateTo(driver, '/color-test')
      await waitForElement(driver, 'color-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'color-test-title')
      expect(await title.getText()).toBe('Color API Test')

      // verify system color boxes are rendered
      const systemColors = [
        'systemBlue',
        'systemRed',
        'systemGreen',
        'systemOrange',
        'systemPurple',
        'systemPink',
        'systemYellow',
        'systemTeal',
        'systemIndigo',
        'systemCyan',
        'systemMint',
        'systemBrown',
      ]

      for (const colorName of systemColors) {
        const box = driver.$(`~color-box-${colorName}`)
        await box.waitForDisplayed({ timeout: 5000 })
        expect(await box.isDisplayed()).toBe(true)

        const label = driver.$(`~color-label-${colorName}`)
        expect(await label.getText()).toBe(colorName)
      }

      await captureScreenshot(driver, 'color-api-ios-system-colors')
    })

    test('renders iOS gray scale colors', sharedTestOptions, async () => {
      // should still be on color-test from previous test
      const grayColors = [
        'systemGray',
        'systemGray2',
        'systemGray3',
        'systemGray4',
        'systemGray5',
        'systemGray6',
      ]

      for (const colorName of grayColors) {
        const box = driver.$(`~color-box-${colorName}`)
        await box.waitForDisplayed({ timeout: 5000 })
        expect(await box.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'color-api-ios-gray-scale')
    })

    test('renders iOS semantic colors', sharedTestOptions, async () => {
      const semanticColors = [
        'label',
        'secondaryLabel',
        'tertiaryLabel',
        'systemFill',
        'separator',
        'link',
      ]

      for (const colorName of semanticColors) {
        const box = driver.$(`~color-box-${colorName}`)
        await box.waitForDisplayed({ timeout: 5000 })
        expect(await box.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'color-api-ios-semantic-colors')
    })

    test('renders iOS background colors', sharedTestOptions, async () => {
      const bgColors = [
        'systemBackground',
        'secondarySystemBackground',
        'tertiarySystemBackground',
      ]

      for (const colorName of bgColors) {
        const box = driver.$(`~color-box-${colorName}`)
        // may need to scroll to see these
        try {
          await box.waitForDisplayed({ timeout: 3000 })
        } catch {
          // scroll down to find it
          await driver.execute('mobile: scroll', { direction: 'down' })
          await box.waitForDisplayed({ timeout: 5000 })
        }
        expect(await box.isDisplayed()).toBe(true)
      }

      // verify the complete render status
      const status = await waitForElement(driver, 'color-render-complete')
      expect(await status.getText()).toBe('Color render complete')

      await captureScreenshot(driver, 'color-api-ios-background-colors')
    })
  })

  // -- zoom transitions (skipped: VxrnZoomSource not registered yet) --

  describe.skip('Zoom Transitions', () => {
    test('zoom source list renders correctly', sharedTestOptions, async () => {
      await navigateTo(driver, '/zoom-test')
      await waitForElement(driver, 'zoom-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'zoom-test-title')
      expect(await title.getText()).toBe('Zoom Transition Test')

      // verify all zoom source items rendered
      const itemIds = ['item-1', 'item-2', 'item-3', 'item-4', 'item-5', 'item-6']
      for (const itemId of itemIds) {
        const source = driver.$(`~zoom-source-${itemId}`)
        try {
          await source.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await source.waitForDisplayed({ timeout: 5000 })
        }
        expect(await source.isDisplayed()).toBe(true)
      }

      // verify status text
      const status = await waitForElement(driver, 'zoom-source-complete')
      expect(await status.getText()).toBe('6 zoom sources rendered')

      await captureScreenshot(driver, 'zoom-transition-source-list')
    })

    test(
      'tapping zoom source shows detail with transition',
      sharedTestOptions,
      async () => {
        // tap the first item to trigger zoom transition
        const firstItem = driver.$('~zoom-source-item-1')
        try {
          await firstItem.waitForDisplayed({ timeout: 5000 })
          await firstItem.click()
        } catch {
          // scroll back up if needed
          await driver.execute('mobile: scroll', { direction: 'up' })
          await firstItem.waitForDisplayed({ timeout: 5000 })
          await firstItem.click()
        }

        // wait for detail screen to appear
        await waitForElement(driver, 'zoom-detail-screen', { timeout: 10_000 })

        const detailTitle = await waitForElement(driver, 'zoom-detail-title')
        expect(await detailTitle.getText()).toBe('Mountain View')

        const detailId = await waitForElement(driver, 'zoom-detail-id')
        expect(await detailId.getText()).toBe('ID: item-1')

        const detailStatus = await waitForElement(driver, 'zoom-detail-complete')
        expect(await detailStatus.getText()).toBe('Zoom detail rendered')

        await captureScreenshot(driver, 'zoom-transition-detail-view')
      }
    )

    test('back button returns to zoom source list', sharedTestOptions, async () => {
      const backButton = await waitForElement(driver, 'zoom-back-button')
      await backButton.click()

      // wait for the list to reappear
      await waitForElement(driver, 'zoom-test-screen', { timeout: 10_000 })

      // verify we're back to the list
      const status = await waitForElement(driver, 'zoom-source-complete')
      expect(await status.getText()).toBe('6 zoom sources rendered')

      await captureScreenshot(driver, 'zoom-transition-back-to-list')
    })
  })

  // -- toolbar --

  describe.skip('Toolbar', () => {
    test(
      'toolbar screen renders with all items described',
      sharedTestOptions,
      async () => {
        await navigateTo(driver, '/toolbar-test')
        await waitForElement(driver, 'toolbar-test-screen', { timeout: 30_000 })

        const title = await waitForElement(driver, 'toolbar-test-title')
        expect(await title.getText()).toBe('Toolbar Test')

        // verify the status card shows initial state
        const lastAction = await waitForElement(driver, 'toolbar-last-action')
        expect(await lastAction.getText()).toBe('none')

        const actionCount = await waitForElement(driver, 'toolbar-action-count')
        expect(await actionCount.getText()).toBe('0')

        await captureScreenshot(driver, 'toolbar-initial-state')
      }
    )

    test('toolbar item descriptions are visible', sharedTestOptions, async () => {
      const items = [
        'toolbar-item-desc-add',
        'toolbar-item-desc-search',
        'toolbar-item-desc-spacer',
        'toolbar-item-desc-share',
        'toolbar-item-desc-settings',
        'toolbar-item-desc-disabled',
      ]

      for (const itemId of items) {
        const item = driver.$(`~${itemId}`)
        try {
          await item.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await item.waitForDisplayed({ timeout: 5000 })
        }
        expect(await item.isDisplayed()).toBe(true)
      }

      const status = await waitForElement(driver, 'toolbar-render-complete')
      expect(await status.getText()).toBe('Toolbar test rendered')

      await captureScreenshot(driver, 'toolbar-with-items')
    })
  })

  // -- menu actions --

  describe.skip('Menu Actions', () => {
    test('menu action screen renders', sharedTestOptions, async () => {
      await navigateTo(driver, '/menu-test')
      await waitForElement(driver, 'menu-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'menu-test-title')
      expect(await title.getText()).toBe('Menu Action Test')

      // verify initial state
      const lastAction = await waitForElement(driver, 'menu-last-action')
      expect(await lastAction.getText()).toBe('none')

      await captureScreenshot(driver, 'menu-actions-initial')
    })

    test('menu action items are rendered', sharedTestOptions, async () => {
      const actionWrappers = [
        'menu-action-edit-wrapper',
        'menu-action-delete-wrapper',
        'menu-action-disabled-wrapper',
        'menu-action-share-wrapper',
        'menu-action-toggle-wrapper',
        'menu-action-hidden-wrapper',
      ]

      for (const wrapperId of actionWrappers) {
        const wrapper = driver.$(`~${wrapperId}`)
        try {
          await wrapper.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await wrapper.waitForDisplayed({ timeout: 5000 })
        }
        expect(await wrapper.isDisplayed()).toBe(true)
      }

      const status = await waitForElement(driver, 'menu-render-complete')
      expect(await status.getText()).toBe('Menu test rendered')

      await captureScreenshot(driver, 'menu-actions-all-rendered')
    })
  })

  // -- split view --

  describe.skip('SplitView', () => {
    test('split view screen renders', sharedTestOptions, async () => {
      await navigateTo(driver, '/split-view-test')
      await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'split-view-title')
      expect(await title.getText()).toBe('SplitView Test')

      await captureScreenshot(driver, 'split-view-initial')
    })

    test('split view shows sidebar items', sharedTestOptions, async () => {
      const sidebarItems = ['inbox', 'sent', 'drafts', 'archive', 'trash']

      for (const itemId of sidebarItems) {
        const item = driver.$(`~split-sidebar-item-${itemId}`)
        try {
          await item.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await item.waitForDisplayed({ timeout: 5000 })
        }
        expect(await item.isDisplayed()).toBe(true)
      }

      await captureScreenshot(driver, 'split-view-sidebar-items')
    })

    test('split view renders completion status', sharedTestOptions, async () => {
      const status = await waitForElement(driver, 'split-view-render-complete')
      expect(await status.getText()).toBe('SplitView test rendered')

      const selectedId = await waitForElement(driver, 'split-view-selected-id')
      expect(await selectedId.getText()).toContain('inbox')

      await captureScreenshot(driver, 'split-view-complete')
    })

    test('split view sidebar selection updates state', sharedTestOptions, async () => {
      // tap drafts
      const draftsItem = driver.$('~split-sidebar-item-drafts')
      try {
        await draftsItem.waitForDisplayed({ timeout: 3000 })
      } catch {
        await driver.execute('mobile: scroll', { direction: 'up' })
        await draftsItem.waitForDisplayed({ timeout: 5000 })
      }
      await draftsItem.click()

      // wait a moment for state update
      await driver.pause(500)

      // verify selected id updated
      const selectedId = await waitForElement(driver, 'split-view-selected-id')
      expect(await selectedId.getText()).toContain('drafts')

      await captureScreenshot(driver, 'split-view-drafts-selected')
    })
  })
})
