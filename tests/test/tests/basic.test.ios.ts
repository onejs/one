import { expect, test } from 'vitest'
import { remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'
const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 3 }

test('basic iOS test', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())

  const textElementInComponent = await driver.$(`~welcome-message`)
  expect(await textElementInComponent.getText()).toBe('Welcome to One')
})
