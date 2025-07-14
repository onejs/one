import { expect, test } from 'vitest'
import { type ChainablePromiseElement, type Browser, remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'
import { setValueSlowly } from '@vxrn/test/utils/appium'
const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 1 }

test('import.meta.env', sharedTestOptions, async () => {
  const driver = await remote(getWebDriverConfig())

  const navigatePathInput = driver.$('~test-navigate-path-input')
  await navigatePathInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await setValueSlowly(driver, navigatePathInput, '/vite-features/import-meta-env')
  await driver.$('~test-navigate').click()

  await driver.$('~import-meta-env-value-json').waitForDisplayed()
  const importMetaEnvValueJson = await driver.$('~import-meta-env-value-json').getText()

  const importMetaEnvValue = JSON.parse(importMetaEnvValueJson)

  expect(importMetaEnvValue.MODE).toBe(
    process.env.TEST_ENV === 'dev' ? 'development' : 'production'
  )
  expect(importMetaEnvValue.DEV).toBe(process.env.TEST_ENV === 'dev')
  expect(importMetaEnvValue.PROD).toBe(process.env.TEST_ENV === 'prod')
  // expect(importMetaEnvValue.SSR).toBe(false) // TODO: this will be true if not using Metro mode

  const testEnvValue = await driver.$('~import-meta-env-VITE_TEST_ENV_VAR_1-value').getText()
  expect(testEnvValue).toBe('test_value_1')

  const testEnvValue2 = await driver.$('~import-meta-env-VITE_TEST_ENV_VAR_1-value-2').getText()
  expect(testEnvValue2).toBe('test_value_1')
})
