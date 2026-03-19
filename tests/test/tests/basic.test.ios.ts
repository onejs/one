import { expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession } from '@vxrn/test/utils/appium'
const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

test('basic iOS test', sharedTestOptions, async () => {
  const driver = await createSession(getWebDriverConfig())

  const textElementInComponent = await driver.$(`~welcome-message`)
  await textElementInComponent.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  expect(await textElementInComponent.getText()).toBe('Welcome to One')
})
