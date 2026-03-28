import { describe, expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, waitForDisplayed } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('loaders on native', () => {
  test('loader data renders on native', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    const loaderDataElement = await waitForDisplayed(driver, driver.$(`~test-loader`), {
      timeout: 2 * 60 * 1000,
    })
    const text = await loaderDataElement.getText()
    expect(text).toContain('hello')
  })
})
