import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { type Browser, type BrowserContext, chromium } from 'playwright'
import { editComponentFile, editRouteFile, revertEditedFiles } from './utils'

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

test('component HMR', { retry: 3 }, async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')

  const textInput = await page.getByTestId('text-input')
  await textInput.fill('page did not reload')

  const textElementInComponent = await page.getByTestId('component-text-content')
  expect(await textElementInComponent.textContent()).toBe('Some text')

  editComponentFile()

  try {
    await page.waitForFunction(
      () => {
        const element = document.querySelector(`[data-testid="component-text-content"]`)
        return element && element.textContent?.trim() === 'Some edited text in component file'
      },
      {},
      { timeout: 10000 }
    )
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.inputValue()).toBe('page did not reload')

  await page.close()
})

test('route HMR', { retry: 3 }, async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')

  const textInput = await page.getByTestId('text-input')
  await textInput.fill('page did not reload')

  const textElementInComponent = await page.getByTestId('route-text-content')
  expect(await textElementInComponent.textContent()).toBe('Some text')

  editRouteFile()

  try {
    await page.waitForFunction(
      () => {
        const element = document.querySelector(`[data-testid="route-text-content"]`)
        return element && element.textContent?.trim() === 'Some edited text in route file'
      },
      {},
      { timeout: 10000 }
    )
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Changes did not seem to HMR: ${e.message}`
    }

    throw e
  }

  expect(await textInput.inputValue()).toBe('page did not reload')

  await page.close()
})
