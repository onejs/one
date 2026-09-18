import { expect, test } from 'vitest'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { navigateTo, waitForDisplayed, withSession } from '@vxrn/test/utils/appium'

test('ignoredRouteFiles', { timeout: 5 * 60 * 1000, retry: 2 }, async () => {
  await withSession(getWebDriverConfig(), async (driver) => {
    await navigateTo(driver, '/router/ignoredRouteFiles/route.normal')

    expect(
      await (
        await waitForDisplayed(driver, driver.$('~ignoredRouteFiles-route-normal'))
      ).isExisting(),
      'normal route file should not be ignored'
    ).not.toBeFalsy()

    await navigateTo(driver, '/router/ignoredRouteFiles/route-1.should-be-ignored')
    expect(
      await (
        await waitForDisplayed(driver, driver.$('~ignoredRouteFiles-not-found'))
      ).isExisting(),
      'route file matching ignoredRouteFiles should be ignored, should show not found page'
    ).not.toBeFalsy()

    await navigateTo(driver, '/router/ignoredRouteFiles/route-2.should-be-ignored')
    expect(
      await (
        await waitForDisplayed(driver, driver.$('~ignoredRouteFiles-not-found'))
      ).isExisting(),
      'route file matching ignoredRouteFiles should be ignored, should show not found page'
    ).not.toBeFalsy()
  })
})
