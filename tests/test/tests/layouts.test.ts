import { type Browser, type BrowserContext, chromium } from 'playwright'
import { afterAll, beforeAll, expect, test, describe } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL
const isDebug = !!process.env.DEBUG

let browser: Browser
let context: BrowserContext

beforeAll(async () => {
  browser = await chromium.launch({ headless: !isDebug })
  context = await browser.newContext()
})

afterAll(async () => {
  await browser.close()
})

describe('layouts', async () => {
  test('nested layout with param', async () => {
    const page = await context.newPage()
    await page.goto(serverUrl + '/layouts')

    // This is part of the test - should be able to navigate to the page via link
    const linkToTestPage = await page.getByTestId('link-to-nested-layout-with-slug-layout-folder')
    linkToTestPage.click()

    const layoutParamsText = await page.getByTestId('layout-params-json').textContent()
    const pageParamsText = await page.getByTestId('page-params-json').textContent()
    const layoutParams = JSON.parse(layoutParamsText || '{}')
    const pageParams = JSON.parse(pageParamsText || '{}')
    expect(
      layoutParams.layoutSlug,
      'useParams in _layout should return expected param value for slug on layout directory'
    ).toBe('someLayoutParam')
    expect(
      pageParams.layoutSlug,
      'useParams in page should return expected param value for slug on layout directory'
    ).toBe('someLayoutParam')
  })
})
