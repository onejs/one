import type { ChainablePromiseElement, Browser } from 'webdriverio'

/**
 * Like `element.setValue` but types slowly, character by character, to reduce the risk of missing characters.
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
 * Currently, this only works when the `TestNavigationHelper` component is shown on the screen.
 */
export async function navigateTo(driver: Browser, path: string) {
  const navigatePathInput = driver.$('~test-navigate-path-input')
  await navigatePathInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await setValueSlowly(driver, navigatePathInput, path)
  await driver.$('~test-navigate').click()
  await driver.pause(100)
}
