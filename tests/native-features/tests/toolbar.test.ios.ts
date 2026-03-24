import { describe, test, expect } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import { captureScreenshot, waitForElement } from '../utils/screenshot'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('Toolbar', () => {
  test('toolbar screen renders with initial state', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/toolbar-test')
    await waitForElement(driver, 'toolbar-test-screen', { timeout: 30_000 })

    const title = await waitForElement(driver, 'toolbar-test-title')
    expect(await title.getText()).toBe('Toolbar Test')

    // verify initial state
    const lastAction = await waitForElement(driver, 'toolbar-last-action')
    expect(await lastAction.getText()).toBe('none')

    const actionCount = await waitForElement(driver, 'toolbar-action-count')
    expect(await actionCount.getText()).toBe('0')

    await captureScreenshot(driver, 'toolbar-initial-state')
  })

  test('toolbar item descriptions are all visible', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/toolbar-test')
    await waitForElement(driver, 'toolbar-test-screen', { timeout: 30_000 })

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

    await captureScreenshot(driver, 'toolbar-all-items-visible')
  })

  test('toolbar completion status is shown', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/toolbar-test')
    await waitForElement(driver, 'toolbar-test-screen', { timeout: 30_000 })

    // scroll to bottom for render status
    await driver.execute('mobile: scroll', { direction: 'down' })

    const status = driver.$('~toolbar-render-complete')
    try {
      await status.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await status.waitForDisplayed({ timeout: 5000 })
    }
    expect(await status.getText()).toBe('Toolbar test rendered')

    await captureScreenshot(driver, 'toolbar-render-complete')
  })
})
