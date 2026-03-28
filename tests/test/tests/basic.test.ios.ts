import { expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, waitForDisplayed } from '@vxrn/test/utils/appium'
const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

test('basic iOS test', sharedTestOptions, async () => {
  const driver = await createSession(getWebDriverConfig())

  const textElementInComponent = await waitForDisplayed(
    driver,
    driver.$(`~welcome-message`),
    { timeout: 2 * 60 * 1000 }
  )
  expect(await textElementInComponent.getText()).toBe('Welcome to One')
})
