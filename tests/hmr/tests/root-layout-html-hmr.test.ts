import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { type Browser, type BrowserContext, chromium } from 'playwright'
import { editFile, revertEditedFiles, root } from './utils'
import path from 'node:path'
import FSExtra from 'fs-extra'

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

/**
 * This test verifies that HMR works correctly for root layouts that contain HTML elements.
 *
 * The issue: When a root _layout.tsx contains <html>, <head>, <body> tags,
 * the component is called directly as a function (Component(props, ref)) rather than
 * rendered as a React element (<Component {...props} ref={ref} />).
 * This bypasses React's normal rendering pipeline and breaks HMR.
 *
 * See: packages/one/src/router/useScreens.tsx line ~200
 */
test('root layout with HTML HMR', { retry: 3 }, async () => {
  // First, modify the layout to include HTML elements (simulating real-world usage)
  const layoutPath = path.join(root, 'app', '_layout.tsx')
  const layoutContent = FSExtra.readFileSync(layoutPath, 'utf-8')

  // Create a layout with HTML that has a testable text element
  const layoutWithHTML = `import React from 'react'
import { Text } from 'react-native'
import { Slot } from 'one'

const text = 'Layout with HTML'

export default function Layout() {
  return (
    <html lang="en-US">
      <head>
        <meta charSet="utf-8" />
      </head>
      <body>
        <Text testID="root-layout-html-text">{text}</Text>
        <Slot />
      </body>
    </html>
  )
}
`

  // Backup and write the HTML version
  const origPath = layoutPath + '.orig'
  FSExtra.copyFileSync(layoutPath, origPath)
  FSExtra.writeFileSync(layoutPath, layoutWithHTML)

  // Track for cleanup
  const editedFilesJsonPath = path.join(root, '_edited_files.json')
  const editedFiles = FSExtra.readJSONSync(editedFilesJsonPath, { throws: false }) || []
  editedFiles.push(layoutPath)
  FSExtra.writeJSONSync(editedFilesJsonPath, editedFiles)

  const page = await context.newPage()

  try {
    await page.goto(serverUrl + '/')

    // Wait for the page to load with the HTML layout
    await page.waitForSelector('[data-testid="root-layout-html-text"]', { timeout: 10000 })

    // Fill a text input to verify page doesn't reload (HMR should preserve state)
    const textInput = await page.getByTestId('text-input')
    await textInput.fill('page did not reload')

    // Verify initial text
    const layoutText = await page.getByTestId('root-layout-html-text')
    expect(await layoutText.textContent()).toBe('Layout with HTML')

    // Now edit the layout file (simulating a code change)
    const editedLayoutWithHTML = layoutWithHTML.replace(
      "const text = 'Layout with HTML'",
      "const text = 'Layout with HTML EDITED'"
    )
    FSExtra.writeFileSync(layoutPath, editedLayoutWithHTML)

    // Wait for HMR to apply the change
    await page.waitForFunction(
      () => {
        const element = document.querySelector('[data-testid="root-layout-html-text"]')
        return element && element.textContent?.trim() === 'Layout with HTML EDITED'
      },
      {},
      { timeout: 30000 }
    )

    // Verify the input value is preserved (page didn't full reload)
    expect(await textInput.inputValue()).toBe('page did not reload')

  } finally {
    await page.close()
  }
})

/**
 * Test that a simple layout without HTML still HMRs correctly.
 * This serves as a baseline to verify the HMR mechanism works in general.
 */
test('root layout without HTML HMR (baseline)', { retry: 3 }, async () => {
  const page = await context.newPage()
  await page.goto(serverUrl + '/')

  const textInput = await page.getByTestId('text-input')
  await textInput.fill('page did not reload')

  const textElementInLayout = await page.getByTestId('layout-text-content')
  expect(await textElementInLayout.textContent()).toBe('Some text')

  // Edit the layout file
  editFile(
    path.join(root, 'app', '_layout.tsx'),
    "const text = 'Some text'",
    "const text = 'Some edited text in layout'"
  )

  try {
    await page.waitForFunction(
      () => {
        const element = document.querySelector('[data-testid="layout-text-content"]')
        return element && element.textContent?.trim() === 'Some edited text in layout'
      },
      {},
      { timeout: 30000 }
    )
  } catch (e) {
    if (e instanceof Error) {
      e.message = `Layout HMR did not work: ${e.message}`
    }
    throw e
  }

  expect(await textInput.inputValue()).toBe('page did not reload')

  await page.close()
})
