import { afterEach, beforeAll, expect, test, inject } from 'vitest'
import path from 'node:path'
import { remote } from 'webdriverio'
import { getWebDriverConfig } from '@vxrn/test/ios'
import {
  editComponentFile,
  editFile,
  editLayoutFile,
  editRouteFile,
  editTestComponentContainingRelativeImportFile,
  revertEditedFiles,
  root,
} from './utils'

beforeAll(async () => {
  revertEditedFiles()
})

afterEach(async () => {
  revertEditedFiles()
})

const sharedTestOptions = { timeout: 10 * 60 * 1000, retry: 3 }

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
  expect((await textInput.getValue()).endsWith('did not reload')).toBe(true)

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

  expect(
    (await textInput.getValue()).endsWith('did not reload'),
    'the app should not fully reload'
  ).toBe(true)
}

// TODO: HMR tests are failing since Expo 54/RN 0.81 upgrade - app fully reloads instead of HMR
test.skip('component HMR', sharedTestOptions, async () => {
  await testHMR(
    'component-text-content',
    'Some text',
    editComponentFile,
    'Some edited text in component file'
  )
})

// TODO: HMR tests are failing since Expo 54/RN 0.81 upgrade - app fully reloads instead of HMR
test.skip('route HMR', sharedTestOptions, async () => {
  await testHMR('route-text-content', 'Some text', editRouteFile, 'Some edited text in route file')
})

// TODO: HMR tests are failing since Expo 54/RN 0.81 upgrade - app fully reloads instead of HMR
test.skip('component containing relative import HMR', sharedTestOptions, async () => {
  await testHMR(
    'TestComponentContainingRelativeImport-text-content',
    'Some text in TestComponentContainingRelativeImport',
    editTestComponentContainingRelativeImportFile,
    'Some edited text in TestComponentContainingRelativeImport'
  )
})

// TODO: HMR tests are failing since Expo 54/RN 0.81 upgrade - app fully reloads instead of HMR
test.skip('component using hook that have native version HMR', sharedTestOptions, async () => {
  await testHMR(
    'TestComponentUsingHookThatHasNativeVersion-text-content',
    'Some text in TestComponentUsingHookThatHasNativeVersion',
    () => {
      editFile(
        path.join(root, 'components', 'TestComponentUsingHookThatHasNativeVersion.tsx'),
        "const text = 'Some text in TestComponentUsingHookThatHasNativeVersion'",
        "const text = 'Some edited text in TestComponentUsingHookThatHasNativeVersion'"
      )
    },
    'Some edited text in TestComponentUsingHookThatHasNativeVersion'
  )
})

// TODO: make this pass
test.skip('layout HMR', sharedTestOptions, async () => {
  await testHMR(
    'layout-text-content',
    'Some text',
    editLayoutFile,
    'Some edited text in layout file'
  )
})
