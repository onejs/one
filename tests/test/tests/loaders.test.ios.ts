import { describe, expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

describe('loaders on native', () => {
  test('loader data renders on native', sharedTestOptions, async () => {
    const driver = await createSession(getWebDriverConfig())

    // verify the loader data is rendered on the home page
    // the index.tsx has a loader that returns { test: 'hello' }
    const loaderDataElement = await driver.$(`~test-loader`)
    await loaderDataElement.waitForDisplayed({ timeout: 2 * 60 * 1000 })
    const text = await loaderDataElement.getText()
    expect(text).toContain('hello')
  })
})
