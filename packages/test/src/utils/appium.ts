import { execSync } from 'node:child_process'
import fs from 'node:fs'
import type { ChainablePromiseElement, Browser } from 'webdriverio'
import { remote } from 'webdriverio'
import type { WebdriverIOConfig } from '../internal-utils/ios'

export class AppCrashedError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AppCrashedError'
  }
}

/**
 * checks if the app is still running by querying the WebDriver session.
 * throws AppCrashedError if the app has crashed.
 */
export async function assertAppRunning(driver: Browser): Promise<void> {
  try {
    await driver.getPageSource()
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('is not running') || msg.includes('possibly crashed')) {
      throw new AppCrashedError(`App has crashed: ${msg}`)
    }
    // other errors (e.g. transient WDA issues) - don't throw
  }
}

/**
 * like element.waitForDisplayed but checks for app crashes periodically.
 * if the app crashes, fails immediately instead of waiting for the full timeout.
 */
async function waitForDisplayedOrAppCrash(
  driver: Browser,
  element: ChainablePromiseElement,
  timeout: number,
  crashCheckInterval = 10_000
): Promise<void> {
  const start = Date.now()
  while (true) {
    const remaining = timeout - (Date.now() - start)
    if (remaining <= 0) {
      throw new Error(
        `Element "${await element.selector}" not displayed after ${timeout}ms`
      )
    }

    const waitChunk = Math.min(crashCheckInterval, remaining)
    try {
      await element.waitForDisplayed({ timeout: waitChunk })
      return
    } catch {
      // check if the app crashed before continuing to wait
      await assertAppRunning(driver)
      // app is alive, element just not found yet - keep waiting
    }
  }
}

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
  const NAVIGATE_TIMEOUT = 2 * 60 * 1000

  const quickNavigatePixel = driver.$('~quick-navigate-pixel')
  try {
    await waitForDisplayedOrAppCrash(driver, quickNavigatePixel, NAVIGATE_TIMEOUT)
    await driver.setClipboard(Buffer.from(path).toString('base64'), 'plaintext')
    await quickNavigatePixel.click()
    await driver.pause(50)

    // system alert dialog asking whether to allow clipboard access
    // on iOS 16+ this may not appear if permission was already granted
    try {
      const alertButtons: Array<string> = await driver.execute('mobile: alert', {
        action: 'getButtons',
      })
      const allowButton = alertButtons.find((label: string) => {
        return label.startsWith('Allow') || label.startsWith('允許')
      })
      if (allowButton) {
        await driver.execute('mobile: alert', {
          action: 'accept',
          buttonLabel: allowButton,
        })
      } else {
        console.warn(
          'appium.navigateTo: "Allow Paste" button not found, trying another way'
        )
        // on iOS, "Don't Allow" is the default button ('accept'),
        // so we need to use 'dismiss' for "Allow".
        await driver.execute('mobile: alert', { action: 'dismiss' })
      }
    } catch {
      // no alert present — clipboard access already granted or not needed
    }

    return
  } catch (e) {
    // if the app crashed, don't bother with fallback - fail immediately
    if (e instanceof AppCrashedError) throw e

    console.warn(
      `Quick navigate pixel not found, falling back to input field navigation: ${e instanceof Error ? e.message : 'Unknown error'}`
    )
    await takeScreenshotForError(driver, e)
  }

  const navigatePathInput = driver.$('~test-navigate-path-input')
  await waitForDisplayedOrAppCrash(driver, navigatePathInput, NAVIGATE_TIMEOUT)
  await setValueSafe(driver, navigatePathInput, path)
  await driver.$('~test-navigate').click()
  await driver.pause(100)
}

/**
 * Note that this will not throw an error if the element is not displayed.
 * Instead, it will return the element as is.
 * DOES throw AppCrashedError if the app has crashed.
 */
export async function waitForDisplayed(
  driver: Browser,
  element: ChainablePromiseElement,
  { timeout = 10 * 1000 }: { timeout?: number } = {}
): Promise<ChainablePromiseElement> {
  try {
    await element.waitForDisplayed({ timeout })
  } catch (err) {
    // if app crashed, throw immediately - no point continuing
    await assertAppRunning(driver)
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

  try {
    await driver.saveScreenshot(screenshotPath)
    const source = await driver.getPageSource()
    await fs.promises.writeFile(sourcePath, source)
  } catch {
    // app may have crashed, screenshot/source not available
  }
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

      // verify the app actually launched successfully
      try {
        await assertAppRunning(driver)
      } catch (e) {
        if (e instanceof AppCrashedError) {
          console.error(
            `[createSession] app crashed immediately after launch on attempt ${attempt}`
          )
          // dump simulator system log for crash diagnostics
          const udid =
            (resolvedConfig.capabilities as any)?.['appium:options']?.udid ||
            process.env.SIMULATOR_UDID
          if (udid) {
            try {
              const log = execSync(
                `xcrun simctl spawn ${udid} log show --predicate 'process == "RNTestContainer" OR subsystem == "com.apple.CrashReporter"' --last 30s --style compact 2>/dev/null || true`,
                { timeout: 10_000, encoding: 'utf8' }
              )
              if (log.trim()) {
                console.error(
                  '[createSession] simulator crash log:\n' + log.slice(0, 3000)
                )
              }
            } catch {}
          }
          throw e
        }
      }

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
