import fs from 'node:fs'
import type { ChainablePromiseElement, Browser } from 'webdriverio'

/**
 * Like `element.setValue` but types slowly, character by character, to reduce the risk of missing characters.
 *
 * See also: `setValueSafe` - it's much faster.
 */
export async function setValueSlowly(
  driver: Browser,
  element: ChainablePromiseElement,
  text: string,
  { delay = 10, initialDelay = 300 }: { delay?: number; initialDelay?: number } = {}
) {
  // Re-select every time to avoid stale element
  const parent = await element.parent
  const selector = await element.selector
  function getElement() {
    return parent.$(selector)
  }

  await getElement().clearValue()
  await getElement().click()

  await driver.pause(initialDelay)

  const e = await getElement()
  for (const char of text) {
    // await getElement().addValue(char)
    // Faster but might be unstable
    await e.addValue(char)

    await driver.pause(delay)
  }
}

/**
 * Like `element.setValue` but using some trick to reduce the risk of missing characters.
 *
 * Note that the implementation may use the clipboard to paste the text.
 * See also: `setValueSafe` - it's safer since it does not rely on the clipboard, but is slower.
 */
export async function setValueSafe(
  driver: Browser,
  element: ChainablePromiseElement,
  text: string
) {
  await setValueSlowly(driver, element, text)
  return

  // Not working on CI
  // Command + V pasting is not stable

  // await driver.setClipboard(Buffer.from(text).toString('base64'), 'plaintext')
  // await element.clearValue()
  // await element.click()
  // await driver.pause(50)

  // // Not working on iOS
  // // await driver.executeScript('mobile: paste', [])

  // // Not working on iOS
  // // await driver.execute('mobile: performEditorAction', { action: 'paste' })

  // // Not working on iOS
  // // await driver.keys(['Meta', 'v']);

  // // Not working on iOS
  // // await driver.performActions([
  // //   {
  // //     type: 'key',
  // //     id: 'keyboard',
  // //     actions: [
  // //       { type: 'keyDown', value: '\uE03D' },
  // //       { type: 'keyDown', value: 'v' },
  // //       { type: 'keyUp', value: 'v' },
  // //       { type: 'keyUp', value: '\uE03D' },
  // //     ],
  // //   },
  // // ])
  // // await driver.releaseActions()

  // // Works on iOS
  // // https://github.com/appium/appium-xcuitest-driver/blob/v9.9.6/docs/reference/execute-methods.md#mobile-keys
  // await driver.execute('mobile: keys', {
  //   keys: [
  //     {
  //       key: 'v',
  //       modifierFlags: 1 << 4, // XCUIKeyModifierCommand
  //     },
  //   ],
  // })
}

/**
 * Currently, this only works when the `TestNavigationHelper` component is shown on the screen.
 */
export async function navigateTo(driver: Browser, path: string) {
  const quickNavigatePixel = driver.$('~quick-navigate-pixel')
  try {
    await quickNavigatePixel.waitForDisplayed({ timeout: 2 * 60 * 1000 })
    await driver.setClipboard(Buffer.from(path).toString('base64'), 'plaintext')
    await quickNavigatePixel.click()
    await driver.pause(50)

    // System alert dialog asking whether to allow clipboard access
    // on iOS, "Don't Allow" is the default button ('accept'),
    // so we need to use 'dismiss' for "Allow".
    await driver.execute('mobile: alert', { action: 'dismiss' })
    return
  } catch (e) {
    console.warn(
      `Quick navigate pixel not found, falling back to input field navigation: ${e instanceof Error ? e.message : 'Unknown error'}`
    )
  }

  const navigatePathInput = driver.$('~test-navigate-path-input')
  await navigatePathInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await setValueSafe(driver, navigatePathInput, path)
  await driver.$('~test-navigate').click()
  await driver.pause(100)
}

export async function waitForDisplayed(
  driver: Browser,
  element: ChainablePromiseElement,
  { timeout = 10 * 1000 }: { timeout?: number } = {}
) {
  try {
    await element.waitForDisplayed({ timeout })
  } catch (err) {
    const timestamp = Date.now()
    const fileName = `${timestamp}-${sanitizeFileName(err instanceof Error ? err.message : 'Unknown error')}`

    await fs.promises.mkdir('/tmp/appium-screenshots', { recursive: true })
    const screenshotPath = `/tmp/appium-screenshots/${fileName}.png`
    const sourcePath = `/tmp/appium-screenshots/${fileName}.xml`

    await driver.saveScreenshot(screenshotPath)
    const source = await driver.getPageSource()
    await fs.promises.writeFile(sourcePath, source)

    throw err
  }
}

function sanitizeFileName(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9-_\. ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}
