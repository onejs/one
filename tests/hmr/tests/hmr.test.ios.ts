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

async function testHMR(
  testId: string,
  originalText: string,
  editFn: () => void,
  editedText: string
) {
  const driver = await remote(getWebDriverConfig())

  const textInput = driver.$('~text-input')
  await textInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await textInput.setValue('app did not reload')
  expect(await textInput.getValue()).toBe('app did not reload')

  const textElementInComponent = await driver.$(`~${testId}`)
  expect(await textElementInComponent.getText()).toBe(originalText)

  editFn()

  try {
    const result = await driver.waitUntil(
      async () => {
        const element = await driver.$(`~${testId}`)
        return element && (await element.getText()) === editedText
      },
      { timeout: 10 * 1000, timeoutMsg: 'Changes did not seem to HMR (timeout)' }
    )
    expect(result).toBe(true)
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.getValue(), 'the app should not fully reload').toBe('app did not reload')
}

test('component HMR', { timeout: 5 * 60 * 1000, retry: 3 }, async () => {
  await testHMR(
    'component-text-content',
    'Some text',
    editComponentFile,
    'Some edited text in component file'
  )
})

test('route HMR', { timeout: 5 * 60 * 1000, retry: 3 }, async () => {
  await testHMR('route-text-content', 'Some text', editRouteFile, 'Some edited text in route file')
})

// TODO: make this pass
test.skip('layout HMR', { timeout: 5 * 60 * 1000, retry: 3 }, async () => {
  await testHMR('layout-text-content', 'Some text', editLayoutFile, 'Some edited text in layout file')
})
