import { describe, test, expect } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo } from '@vxrn/test/utils/appium'
import { captureScreenshot, waitForElement } from '../utils/screenshot'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('Color API - iOS system colors', () => {
  test('renders all iOS system color boxes', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    // wait for home screen then navigate to color test
    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/color-test')
    await waitForElement(driver, 'color-test-screen', { timeout: 30_000 })

    // verify the title
    const title = await waitForElement(driver, 'color-test-title')
    expect(await title.getText()).toBe('Color API Test')

    // verify each system color renders as a visible box
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
    }

    await captureScreenshot(driver, 'color-api-system-colors-all')
  })

  test('renders iOS gray scale progression', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
    await navigateTo(driver, '/color-test')
    await waitForElement(driver, 'color-test-screen', { timeout: 30_000 })

    const grays = [
      'systemGray',
      'systemGray2',
      'systemGray3',
      'systemGray4',
      'systemGray5',
      'systemGray6',
    ]

    for (const gray of grays) {
      const box = driver.$(`~color-box-${gray}`)
      try {
        await box.waitForDisplayed({ timeout: 3000 })
      } catch {
        await driver.execute('mobile: scroll', { direction: 'down' })
        await box.waitForDisplayed({ timeout: 5000 })
      }
      expect(await box.isDisplayed()).toBe(true)
    }

    await captureScreenshot(driver, 'color-api-gray-scale-all')
  })

  test(
    'renders semantic and background colors with completion marker',
    sharedTestOptions,
    async () => {
      const driver = await createSession(getWebDriverConfig())

      await waitForElement(driver, 'home-screen', { timeout: 2 * 60 * 1000 })
      await navigateTo(driver, '/color-test')
      await waitForElement(driver, 'color-test-screen', { timeout: 30_000 })

      // scroll to bottom for semantic + background colors
      await driver.execute('mobile: scroll', { direction: 'down' })

      const semanticColors = ['label', 'secondaryLabel', 'systemFill', 'link']
      for (const colorName of semanticColors) {
        const box = driver.$(`~color-box-${colorName}`)
        try {
          await box.waitForDisplayed({ timeout: 3000 })
        } catch {
          await driver.execute('mobile: scroll', { direction: 'down' })
          await box.waitForDisplayed({ timeout: 5000 })
        }
        expect(await box.isDisplayed()).toBe(true)
      }

      // scroll further for background colors and status
      await driver.execute('mobile: scroll', { direction: 'down' })

      const status = driver.$('~color-render-complete')
      try {
        await status.waitForDisplayed({ timeout: 3000 })
      } catch {
        await driver.execute('mobile: scroll', { direction: 'down' })
        await status.waitForDisplayed({ timeout: 5000 })
      }
      expect(await status.getText()).toBe('Color render complete')

      await captureScreenshot(driver, 'color-api-semantic-background-complete')
    }
  )
})
