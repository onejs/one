import { describe, test, expect } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import { captureScreenshot, waitForElement } from '../utils/screenshot'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('SplitView', () => {
  test('split view screen renders', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/split-view-test')
    await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

    const title = await waitForElement(driver, 'split-view-title')
    expect(await title.getText()).toBe('SplitView Test')

    await captureScreenshot(driver, 'split-view-screen-loaded')
  })

  test('split view sidebar items are present', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/split-view-test')
    await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

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

    await captureScreenshot(driver, 'split-view-sidebar-all-items')
  })

  test('split view default selection is inbox', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/split-view-test')
    await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

    // scroll down to status bar
    await driver.execute('mobile: scroll', { direction: 'down' })

    const selectedId = driver.$('~split-view-selected-id')
    try {
      await selectedId.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await selectedId.waitForDisplayed({ timeout: 5000 })
    }
    expect(await selectedId.getText()).toContain('inbox')

    await captureScreenshot(driver, 'split-view-default-inbox')
  })

  test('split view sidebar tap changes selection', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/split-view-test')
    await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

    // tap archive
    const archiveItem = driver.$('~split-sidebar-item-archive')
    try {
      await archiveItem.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await archiveItem.waitForDisplayed({ timeout: 5000 })
    }
    await archiveItem.click()
    await driver.pause(500)

    // scroll to check updated status
    await driver.execute('mobile: scroll', { direction: 'down' })

    const selectedId = driver.$('~split-view-selected-id')
    try {
      await selectedId.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await selectedId.waitForDisplayed({ timeout: 5000 })
    }
    expect(await selectedId.getText()).toContain('archive')

    await captureScreenshot(driver, 'split-view-archive-selected')
  })

  test('split view render complete', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/split-view-test')
    await waitForElement(driver, 'split-view-test-screen', { timeout: 30_000 })

    // scroll to bottom for render status
    await driver.execute('mobile: scroll', { direction: 'down' })

    const status = driver.$('~split-view-render-complete')
    try {
      await status.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await status.waitForDisplayed({ timeout: 5000 })
    }
    expect(await status.getText()).toBe('SplitView test rendered')

    await captureScreenshot(driver, 'split-view-render-complete')
  })
})
