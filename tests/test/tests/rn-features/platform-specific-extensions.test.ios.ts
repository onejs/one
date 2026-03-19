import { expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { createSession, navigateTo, waitForDisplayed } from '@vxrn/test/utils/appium'

test('platform-specific-extensions', { timeout: 5 * 60 * 1000, retry: 2 }, async () => {
  const driver = await createSession(getWebDriverConfig())
  await navigateTo(driver, '/rn-features/platform-specific-extensions/test')

  await waitForDisplayed(driver, driver.$('~TestComponent1'))
  expect(await driver.$('~TestComponent1').getText()).toBe('TestComponent1.native')

  await navigateTo(driver, '/rn-features/platform-specific-extensions/test-route-1')
  await waitForDisplayed(driver, driver.$('~test-route-1'))
  expect(await driver.$('~test-route-1').getText()).toBe('test-route-1.native')

  await navigateTo(driver, '/rn-features/platform-specific-extensions/test-route-2')
  await waitForDisplayed(driver, driver.$('~test-route-2'))
  expect(await driver.$('~test-route-2').getText()).toBe('test-route-2.ios')
})
