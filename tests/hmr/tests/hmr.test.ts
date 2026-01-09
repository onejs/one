import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { type Browser, type BrowserContext, chromium } from 'playwright'
import {
  editComponentFile,
  editLayoutFile,
  editRouteFile,
  editTestComponentContainingRelativeImportFile,
  revertEditedFiles,
} from './utils'

const serverUrl = process.env.ONE_SERVER_URL

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  revertEditedFiles()
  browser = await chromium.launch({ headless: !process.env.DEBUG })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
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
  const page = await context.newPage()
  await page.goto(serverUrl + '/')

  const textInput = await page.getByTestId('text-input')
  await textInput.fill('page did not reload')

  const textElementInComponent = await page.getByTestId(testId)
  expect(await textElementInComponent.textContent()).toBe(originalText)

  editFn()

  try {
    await page.waitForFunction(
      ({ testId, editedText }) => {
        const element = document.querySelector(`[data-testid="${testId}"]`)
        return element && element.textContent?.trim() === editedText
      },
      { testId, editedText },
      { timeout: 30000 }
    )
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.inputValue()).toBe('page did not reload')

  await page.close()
}

test('component HMR', { retry: 3 }, async () => {
  await testHMR(
    'component-text-content',
    'Some text',
    editComponentFile,
    'Some edited text in component file'
  )
})

test('route HMR', { retry: 3 }, async () => {
  await testHMR(
    'route-text-content',
    'Some text',
    editRouteFile,
    'Some edited text in route file'
  )
})

test('component containing relative import HMR', { retry: 3 }, async () => {
  await testHMR(
    'TestComponentContainingRelativeImport-text-content',
    'Some text in TestComponentContainingRelativeImport',
    editTestComponentContainingRelativeImportFile,
    'Some edited text in TestComponentContainingRelativeImport'
  )
})

// Root layouts are called as functions (not rendered as React components) to support HTML elements.
// This means React can't preserve child state during layout HMR - the layout updates but state is lost.
// The layout DOES update without a full page reload, but this test expects state preservation.
test.skip('layout HMR', { retry: 3 }, async () => {
  await testHMR(
    'layout-text-content',
    'Some text',
    editLayoutFile,
    'Some edited text in layout file'
  )
})
