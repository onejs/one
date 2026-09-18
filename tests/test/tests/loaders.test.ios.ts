import { describe, expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { waitForDisplayed, withSession } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('loaders on native', () => {
  test('loader data renders on native', sharedTestOptions, async () => {
    await withSession(getWebDriverConfig(), async (driver) => {
      const loaderDataElement = await waitForDisplayed(driver, driver.$(`~test-loader`), {
        timeout: 2 * 60 * 1000,
      })
      const text = await loaderDataElement.getText()
      expect(text).toContain('hello')
    })
  })
})
