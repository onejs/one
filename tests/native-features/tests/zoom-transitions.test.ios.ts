import { describe, test, expect } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import { captureScreenshot, waitForElement } from '../utils/screenshot'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('Zoom Transitions', () => {
  test('zoom source items render correctly', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/zoom-test')
    await waitForElement(driver, 'zoom-test-screen', { timeout: 30_000 })

    const title = await waitForElement(driver, 'zoom-test-title')
    expect(await title.getText()).toBe('Zoom Transition Test')

    // verify each zoom source item is present
    const items = [
      { id: 'item-1', title: 'Mountain View' },
      { id: 'item-2', title: 'Ocean Breeze' },
      { id: 'item-3', title: 'Sunset Glow' },
      { id: 'item-4', title: 'Purple Haze' },
      { id: 'item-5', title: 'Golden Hour' },
      { id: 'item-6', title: 'Midnight Blue' },
    ]

    for (const item of items) {
      const source = driver.$(`~zoom-source-${item.id}`)
      try {
        await source.waitForDisplayed({ timeout: 3000 })
      } catch {
        await driver.execute('mobile: scroll', { direction: 'down' })
        await source.waitForDisplayed({ timeout: 5000 })
      }
      expect(await source.isDisplayed()).toBe(true)

      // verify the title text in each card
      const titleEl = driver.$(`~zoom-source-title-${item.id}`)
      expect(await titleEl.getText()).toBe(item.title)
    }

    // verify render status
    const status = driver.$('~zoom-source-complete')
    try {
      await status.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await status.waitForDisplayed({ timeout: 5000 })
    }
    expect(await status.getText()).toBe('6 zoom sources rendered')

    await captureScreenshot(driver, 'zoom-sources-verified')
  })

  test('zoom transition navigates to detail view', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/zoom-test')
    await waitForElement(driver, 'zoom-test-screen', { timeout: 30_000 })

    // tap the first zoom source card
    const firstItem = driver.$('~zoom-source-item-1')
    await firstItem.waitForDisplayed({ timeout: 5000 })
    await firstItem.click()

    // verify detail screen appears
    await waitForElement(driver, 'zoom-detail-screen', { timeout: 10_000 })

    const detailTitle = await waitForElement(driver, 'zoom-detail-title')
    expect(await detailTitle.getText()).toBe('Mountain View')

    const detailId = await waitForElement(driver, 'zoom-detail-id')
    expect(await detailId.getText()).toBe('ID: item-1')

    await captureScreenshot(driver, 'zoom-detail-item-1')

    // go back
    const backButton = await waitForElement(driver, 'zoom-back-button')
    await backButton.click()

    // verify we're back on the list
    await waitForElement(driver, 'zoom-test-screen', { timeout: 10_000 })

    await captureScreenshot(driver, 'zoom-back-to-list')
  })

  test('zoom transition works for different items', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/zoom-test')
    await waitForElement(driver, 'zoom-test-screen', { timeout: 30_000 })

    // tap the third item (Sunset Glow)
    const thirdItem = driver.$('~zoom-source-item-3')
    try {
      await thirdItem.waitForDisplayed({ timeout: 3000 })
    } catch {
      await driver.execute('mobile: scroll', { direction: 'down' })
      await thirdItem.waitForDisplayed({ timeout: 5000 })
    }
    await thirdItem.click()

    await waitForElement(driver, 'zoom-detail-screen', { timeout: 10_000 })

    const detailTitle = await waitForElement(driver, 'zoom-detail-title')
    expect(await detailTitle.getText()).toBe('Sunset Glow')

    const detailId = await waitForElement(driver, 'zoom-detail-id')
    expect(await detailId.getText()).toBe('ID: item-3')

    await captureScreenshot(driver, 'zoom-detail-item-3')
  })
})
