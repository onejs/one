import { expect, test } from 'vitest'
import { remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { navigateTo, waitForDisplayed } from '@vxrn/test/utils/appium'

const sharedTestOptions = { timeout: 5 * 60 * 1000, retry: 2 }

test('Protected routes - shows public page and can toggle auth', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())
  await navigateTo(driver, '/protected-test')

  // Wait for public page to be displayed
  await waitForDisplayed(driver, driver.$('~public-page'))
  expect(await driver.$('~public-page').getText()).toContain('Public Page')

  // Check initial auth status
  await waitForDisplayed(driver, driver.$('~auth-status'))
  expect(await driver.$('~auth-status').getText()).toContain('Auth: false')

  // Toggle auth
  const toggleAuth = await driver.$('~toggle-auth')
  await toggleAuth.click()
  await driver.pause(500)

  // Verify auth status changed
  expect(await driver.$('~auth-status').getText()).toContain('Auth: true')
})

test('Protected routes - can access protected route after auth', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())
  await navigateTo(driver, '/protected-test')

  // Wait for page to load
  await waitForDisplayed(driver, driver.$('~public-page'))

  // Toggle auth on
  const toggleAuth = await driver.$('~toggle-auth')
  await toggleAuth.click()
  await driver.pause(500)

  // Navigate to dashboard via link
  const dashboardLink = await driver.$('~link-dashboard')
  await dashboardLink.click()
  await driver.pause(500)

  // Should see dashboard page
  await waitForDisplayed(driver, driver.$('~dashboard-page'))
  expect(await driver.$('~dashboard-page').getText()).toContain('Dashboard Page')
})

test('Protected routes - cannot access protected route when not authed', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())
  await navigateTo(driver, '/protected-test')

  // Wait for page to load
  await waitForDisplayed(driver, driver.$('~public-page'))

  // Verify auth is false
  expect(await driver.$('~auth-status').getText()).toContain('Auth: false')

  // Try to click the dashboard link
  const dashboardLink = await driver.$('~link-dashboard')
  await dashboardLink.click()
  await driver.pause(500)

  // Should still see public page (protected route doesn't exist when not authed)
  expect(await driver.$('~public-page').getText()).toContain('Public Page')
})
