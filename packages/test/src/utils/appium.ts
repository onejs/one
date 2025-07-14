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

  for (const char of text) {
    await getElement().addValue(char)
    await driver.pause(delay)
  }
}
