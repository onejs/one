import { describe, test, expect } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import { captureScreenshot, waitForElement } from '../utils/screenshot'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('Menu Actions', () => {
  test(
    'menu action screen renders with all action types',
    sharedTestOptions,
    async () => {
      const driver = await createSession(getWebDriverConfig())

      await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
      await navigateTo(driver, '/menu-test')
      await waitForElement(driver, 'menu-test-screen', { timeout: 30_000 })

      const title = await waitForElement(driver, 'menu-test-title')
      expect(await title.getText()).toBe('Menu Action Test')

      // verify initial state
      const lastAction = await waitForElement(driver, 'menu-last-action')
      expect(await lastAction.getText()).toBe('none')

      await captureScreenshot(driver, 'menu-actions-initial-state')
    }
  )

  test('all menu action wrappers are present', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/menu-test')
    await waitForElement(driver, 'menu-test-screen', { timeout: 30_000 })

    // basic action
    const editWrapper = driver.$('~menu-action-edit-wrapper')
    await editWrapper.waitForDisplayed({ timeout: 5000 })
    expect(await editWrapper.isDisplayed()).toBe(true)

    // destructive action
    const deleteWrapper = driver.$('~menu-action-delete-wrapper')
    await deleteWrapper.waitForDisplayed({ timeout: 5000 })
    expect(await deleteWrapper.isDisplayed()).toBe(true)

    // disabled action
    const disabledWrapper = driver.$('~menu-action-disabled-wrapper')
    await disabledWrapper.waitForDisplayed({ timeout: 5000 })
    expect(await disabledWrapper.isDisplayed()).toBe(true)

    await captureScreenshot(driver, 'menu-actions-basic-types')

    // scroll for more actions
    await driver.execute('mobile: scroll', { direction: 'down' })

    // share action with accessibility
    const shareWrapper = driver.$('~menu-action-share-wrapper')
    try {
      await shareWrapper.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await shareWrapper.waitForDisplayed({ timeout: 5000 })
    }
    expect(await shareWrapper.isDisplayed()).toBe(true)

    // toggle action
    const toggleWrapper = driver.$('~menu-action-toggle-wrapper')
    try {
      await toggleWrapper.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await toggleWrapper.waitForDisplayed({ timeout: 5000 })
    }
    expect(await toggleWrapper.isDisplayed()).toBe(true)

    // hidden action wrapper (wrapper is visible, action inside should be hidden on ios)
    const hiddenWrapper = driver.$('~menu-action-hidden-wrapper')
    try {
      await hiddenWrapper.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await hiddenWrapper.waitForDisplayed({ timeout: 5000 })
    }
    expect(await hiddenWrapper.isDisplayed()).toBe(true)

    await captureScreenshot(driver, 'menu-actions-all-types')
  })

  test('menu render completion status', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/menu-test')
    await waitForElement(driver, 'menu-test-screen', { timeout: 30_000 })

    // scroll to bottom
    await driver.execute('mobile: scroll', { direction: 'down' })
    await driver.execute('mobile: scroll', { direction: 'down' })

    const status = driver.$('~menu-render-complete')
    try {
      await status.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await status.waitForDisplayed({ timeout: 5000 })
    }
    expect(await status.getText()).toBe('Menu test rendered')

    await captureScreenshot(driver, 'menu-actions-complete')
  })
})
