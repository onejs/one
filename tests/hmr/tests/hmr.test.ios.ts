// @vitest-environment native

import { afterEach, beforeAll, expect, test, inject } from 'vitest'
import { remote } from 'webdriverio'
import { editComponentFile, editLayoutFile, editRouteFile, revertEditedFiles } from './utils'
import { getWebDriverConfig } from '../vitest-environment-native'

beforeAll(async () => {
  revertEditedFiles()
})

afterEach(async () => {
  revertEditedFiles()
})

test('component HMR', { timeout: 5 * 60 * 1000, retry: 3 }, async () => {
  const driver = await remote(getWebDriverConfig())

  const textInput = driver.$('~text-input')
  await textInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await textInput.setValue('app did not reload')
  expect(await textInput.getValue()).toBe('app did not reload')

  const textElementInComponent = driver.$('~component-text-content')
  expect(await textElementInComponent.getText()).toBe('Some text')

  editComponentFile()

  try {
    const result = await driver.waitUntil(
      async () => {
        const element = await driver.$('~component-text-content')
        return element && (await element.getText()) === 'Some edited text in component file'
      },
      { timeout: 10 * 1000 }
    )
    expect(result).toBe(true)
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.getValue(), 'the app should not fully reload').toBe('app did not reload')
})

test('route HMR', { timeout: 5 * 60 * 1000, retry: 3 }, async () => {
  const driver = await remote(getWebDriverConfig())

  const textInput = driver.$('~text-input')
  await textInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await textInput.setValue('app did not reload')
  expect(await textInput.getValue()).toBe('app did not reload')

  const textElementInComponent = driver.$('~route-text-content')
  expect(await textElementInComponent.getText()).toBe('Some text')

  editRouteFile()

  try {
    const result = await driver.waitUntil(
      async () => {
        const element = await driver.$('~route-text-content')
        return element && (await element.getText()) === 'Some edited text in route file'
      },
      { timeout: 10 * 1000 }
    )
    expect(result).toBe(true)
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.getValue(), 'the app should not fully reload').toBe('app did not reload')
})

// TODO: make this pass
test.skip('layout HMR', { timeout: 5 * 60 * 1000, retry: 3 }, async () => {
  const driver = await remote(getWebDriverConfig())

  const textInput = driver.$('~text-input')
  await textInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await textInput.setValue('app did not reload')
  expect(await textInput.getValue()).toBe('app did not reload')

  const textElementInComponent = driver.$('~layout-text-content')
  expect(await textElementInComponent.getText()).toBe('Some text')

  editLayoutFile()

  try {
    const result = await driver.waitUntil(
      async () => {
        const element = await driver.$('~layout-text-content')
        return element && (await element.getText()) === 'Some edited text in layout file'
      },
      { timeout: 10 * 1000 }
    )
    expect(result).toBe(true)
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.getValue(), 'the app should not fully reload').toBe('app did not reload')
})
