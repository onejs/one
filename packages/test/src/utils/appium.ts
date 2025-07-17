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
  const navigatePathInput = driver.$('~test-navigate-path-input')
  await navigatePathInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await setValueSafe(driver, navigatePathInput, path)
  await driver.$('~test-navigate').click()
  await driver.pause(100)
}
