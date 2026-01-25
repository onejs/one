import { expect, test } from 'vitest'
import { remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { navigateTo, waitForDisplayed } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 3 }

test('useMatches returns matched routes on native', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())

  // navigate to the matches-test page
  await navigateTo(driver, '/matches-test')

  // verify layout loader data is rendered
  const layoutDataElement = driver.$(`~layout-data: layout-loader-data`)
  await waitForDisplayed(driver, layoutDataElement)

  // verify page loader data is rendered
  const pageDataElement = driver.$(`~page-data: page-loader-data`)
  await waitForDisplayed(driver, pageDataElement)

  // verify matches count is at least 2 (layout + page)
  const matchesCountElement = driver.$(`[name^="matches-count:"]`)
  await waitForDisplayed(driver, matchesCountElement)
  const matchesCountText = await matchesCountElement.getAttribute('name')
  const matchCount = parseInt(matchesCountText?.split(': ')[1] || '0')
  expect(matchCount).toBeGreaterThanOrEqual(2)
})
