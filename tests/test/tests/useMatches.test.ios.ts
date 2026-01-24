import { expect, test } from 'vitest'
import { remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 3 }

test('useMatches returns matched routes on native', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())

  // navigate to the matches-test page
  await driver.execute('mobile: deepLink', {
    url: 'one://matches-test',
    bundleId: 'dev.vxrn.test',
  })

  // wait for the page to load
  await driver.pause(2000)

  // verify layout loader data is rendered
  const layoutDataElement = await driver.$(`~layout-data: layout-loader-data`)
  expect(await layoutDataElement.isDisplayed()).toBe(true)

  // verify page loader data is rendered
  const pageDataElement = await driver.$(`~page-data: page-loader-data`)
  expect(await pageDataElement.isDisplayed()).toBe(true)

  // verify matches count is at least 2 (layout + page)
  const matchesCountElement = await driver.$(`[name^="matches-count:"]`)
  const matchesCountText = await matchesCountElement.getAttribute('name')
  const matchCount = parseInt(matchesCountText?.split(': ')[1] || '0')
  expect(matchCount).toBeGreaterThanOrEqual(2)
})
