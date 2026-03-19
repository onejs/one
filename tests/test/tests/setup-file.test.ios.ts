import { expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

test('setupFile runs on native', sharedTestOptions, async () => {
  const driver = await createSession(getWebDriverConfig())

  // The home page displays the native setup status
  // Wait for the native-setup-ran element to be displayed
  const nativeSetupElement = await driver.$(`~native-setup-ran`)
  await nativeSetupElement.waitForDisplayed({ timeout: 2 * 60 * 1000 })

  const nativeSetupText = await nativeSetupElement.getText()
  expect(nativeSetupText).toContain('true')
})
