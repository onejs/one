import fs from 'node:fs'
import path from 'node:path'
import type { Browser } from 'webdriverio'

const SCREENSHOT_DIR = '/tmp/appium-screenshots/native-features'

/**
 * capture a screenshot at a critical test moment.
 * saves to /tmp/appium-screenshots/native-features/ with a semantic name.
 */
export async function captureScreenshot(
  driver: Browser,
  name: string,
  opts?: { savePageSource?: boolean }
): Promise<{ screenshotPath: string; base64: string; sourcePath?: string }> {
  await fs.promises.mkdir(SCREENSHOT_DIR, { recursive: true })

  const timestamp = Date.now()
  const sanitized = name
    .replace(/[^a-zA-Z0-9-_. ]/g, '')
    .replace(/\s+/g, '-')
    .toLowerCase()
  const fileName = `${sanitized}-${timestamp}`

  const screenshotPath = path.join(SCREENSHOT_DIR, `${fileName}.png`)
  const base64 = await driver.saveScreenshot(screenshotPath)

  let sourcePath: string | undefined
  if (opts?.savePageSource) {
    sourcePath = path.join(SCREENSHOT_DIR, `${fileName}.xml`)
    const source = await driver.getPageSource()
    await fs.promises.writeFile(sourcePath, source)
  }

  console.info(`[screenshot] saved: ${screenshotPath}`)
  return { screenshotPath, base64: base64.toString(), sourcePath }
}

/**
 * capture a screenshot on test failure. includes page source for debugging.
 */
export async function captureErrorScreenshot(
  driver: Browser,
  testName: string,
  error: unknown
): Promise<void> {
  try {
    const errMsg = error instanceof Error ? error.message : 'unknown-error'
    const sanitizedErr = errMsg.replace(/[^a-zA-Z0-9-_. ]/g, '').slice(0, 60)
    await captureScreenshot(driver, `ERROR-${testName}-${sanitizedErr}`, {
      savePageSource: true,
    })
  } catch (screenshotError) {
    console.warn(`[screenshot] failed to capture error screenshot: ${screenshotError}`)
  }
}

/**
 * wait for an element by accessibility id and capture screenshot on failure.
 */
export async function waitForElement(
  driver: Browser,
  accessibilityId: string,
  opts?: { timeout?: number; screenshotOnFail?: boolean }
) {
  const timeout = opts?.timeout ?? 30_000
  const element = driver.$(`~${accessibilityId}`)

  try {
    await element.waitForDisplayed({ timeout })
  } catch (err) {
    if (opts?.screenshotOnFail !== false) {
      await captureErrorScreenshot(driver, `waitFor-${accessibilityId}`, err)
    }
    throw err
  }

  return element
}
