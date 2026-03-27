import { expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, waitForDisplayed } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

test('setupFile runs on native', sharedTestOptions, async () => {
  const driver = await createSession(getWebDriverConfig())

  const nativeSetupElement = await waitForDisplayed(driver, driver.$(`~native-setup-ran`), { timeout: 2 * 60 * 1000 })

  const nativeSetupText = await nativeSetupElement.getText()
  expect(nativeSetupText).toContain('true')
})
