import { execSync } from 'node:child_process'
import fs from 'node:fs'
import type { ChainablePromiseElement, Browser } from 'webdriverio'
import { remote } from 'webdriverio'
import type { WebdriverIOConfig } from '../internal-utils/ios'

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
  // TODO: using setValueSlowly for now since we can't find a way to paste text reliably on CI.
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
    const alertButtons: Array<string> = await driver.execute('mobile: alert', {
      action: 'getButtons',
    })
    const allowButton = alertButtons.find((label: string) => {
      return label.startsWith('Allow') || label.startsWith('允許')
    })
    if (allowButton) {
      // If we can find the "Allow" button, we can just press it.
      await driver.execute('mobile: alert', {
        action: 'accept',
        buttonLabel: allowButton,
      })
    } else {
      console.warn(
        'appium.navigateTo: "Allow Paste" button not found, trying another way'
      )
      // On iOS, "Don't Allow" is the default button ('accept'),
      // so we need to use 'dismiss' for "Allow".
      await driver.execute('mobile: alert', { action: 'dismiss' })
    }

    return
  } catch (e) {
    console.warn(
      `Quick navigate pixel not found, falling back to input field navigation: ${e instanceof Error ? e.message : 'Unknown error'}`
    )
    await takeScreenshotForError(driver, e)
  }

  const navigatePathInput = driver.$('~test-navigate-path-input')
  await navigatePathInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await setValueSafe(driver, navigatePathInput, path)
  await driver.$('~test-navigate').click()
  await driver.pause(100)
}

/**
 * Note that this will not throw an error if the element is not displayed.
 * Instead, it will return the element as is.
 */
export async function waitForDisplayed(
  driver: Browser,
  element: ChainablePromiseElement,
  { timeout = 10 * 1000 }: { timeout?: number } = {}
): Promise<ChainablePromiseElement> {
  try {
    await element.waitForDisplayed({ timeout })
  } catch (err) {
    await takeScreenshotForError(driver, err)
  }
  return element
}

async function takeScreenshotForError(driver: Browser, err: unknown) {
  const timestamp = Date.now()
  const fileName = `${timestamp}-${sanitizeFileName(err instanceof Error ? err.message : 'Unknown error')}`

  await fs.promises.mkdir('/tmp/appium-screenshots', { recursive: true })
  const screenshotPath = `/tmp/appium-screenshots/${fileName}.png`
  const sourcePath = `/tmp/appium-screenshots/${fileName}.xml`

  await driver.saveScreenshot(screenshotPath)
  const source = await driver.getPageSource()
  await fs.promises.writeFile(sourcePath, source)
}

function sanitizeFileName(input: string): string {
  return input
    .replace(/[^a-zA-Z0-9-_. ]/g, '')
    .replace(/\s+/g, '_')
    .slice(0, 100)
}

/**
 * create a webdriver session with retry and recovery logic.
 * when WDA fails (ECONNREFUSED, app unknown to FrontBoard, etc),
 * this terminates the app and verifies appium health between retries.
 */
export async function createSession(
  config: WebdriverIOConfig | Promise<WebdriverIOConfig>,
  { maxRetries = 3 }: { maxRetries?: number } = {}
): Promise<Browser> {
  const resolvedConfig = await config
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.info(`[createSession] attempt ${attempt}/${maxRetries}`)
        await recoverSimulator(resolvedConfig)
      }

      const driver = await remote(resolvedConfig)
      return driver
    } catch (err) {
      lastError = err
      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[createSession] attempt ${attempt}/${maxRetries} failed: ${msg}`)
    }
  }

  throw lastError
}

async function recoverSimulator(config: WebdriverIOConfig) {
  try {
    // check appium is still alive
    const appiumPort = config.port || 4723
    const resp = await fetch(`http://localhost:${appiumPort}/status`)
    const data = (await resp.json()) as { value?: { ready?: boolean } }
    if (!data?.value?.ready) {
      console.warn('[createSession] appium reports not ready')
    }
  } catch {
    console.warn('[createSession] appium health check failed')
  }

  // terminate the test app if it's stuck
  const udid =
    (config.capabilities as any)?.['appium:options']?.udid || process.env.SIMULATOR_UDID
  if (udid) {
    try {
      // terminate any running app on the simulator
      execSync(
        `xcrun simctl terminate ${udid} dev.onestack.rntestcontainer 2>/dev/null || true`,
        { timeout: 10_000 }
      )
    } catch {}
  }

  // brief pause for system recovery
  await new Promise((r) => setTimeout(r, 3000))
}
