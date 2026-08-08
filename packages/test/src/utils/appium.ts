import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
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
 * circuit breaker for a deterministic crash-on-launch.
 *
 * the app either launches or it doesn't — if it crashes immediately the first
 * time, it will crash every time. without this, a crashing prod bundle gets
 * relaunched across every test file (each with its own retries), burning the
 * entire 45-min job budget until GitHub force-cancels the run. that shows up as
 * a "cancelled" run, which looks like infra flake and hides a real failure.
 *
 * the marker is keyed by TEST_ENV (dev/prod run as separate vitest processes)
 * and written to a shared tmp file so it survives across vitest worker threads.
 */
const crashMarkerPath = path.join(
  os.tmpdir(),
  `one-ios-app-crash-${process.env.TEST_ENV || 'unknown'}.marker`
)

function getRecordedCrash(): string | null {
  try {
    return fs.readFileSync(crashMarkerPath, 'utf8')
  } catch {
    return null
  }
}

function recordCrash(reason: string) {
  try {
    fs.writeFileSync(crashMarkerPath, reason)
  } catch {}
}

/** clear the crash circuit breaker — call once at suite start. */
export function clearAppCrashMarker() {
  try {
    fs.rmSync(crashMarkerPath, { force: true })
  } catch {}
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

export async function navigateTo(driver: Browser, path: string) {
  const NAVIGATE_TIMEOUT = 2 * 60 * 1000
  const navigatePathInput = driver.$('~quick-navigate-path-input')
  await waitForDisplayedOrAppCrash(driver, navigatePathInput, NAVIGATE_TIMEOUT)
  await setValueSlowly(driver, navigatePathInput, path)
  await driver.$('~quick-navigate-submit').click()
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

async function getAvailablePort() {
  const net = await import('node:net')

  return await new Promise<number>((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        reject(new Error(`Failed to allocate a TCP port: ${String(address)}`))
        return
      }
      const { port } = address
      server.close((error) => {
        if (error) {
          reject(error)
          return
        }
        resolve(port)
      })
    })
  })
}

async function withFreshWdaLocalPort(
  config: WebdriverIOConfig
): Promise<WebdriverIOConfig> {
  const capabilities = config.capabilities as any
  const appiumOptions = capabilities?.['appium:options']

  if (!appiumOptions || appiumOptions.webDriverAgentUrl) {
    return config
  }

  return {
    ...config,
    capabilities: {
      ...capabilities,
      'appium:options': {
        ...appiumOptions,
        wdaLocalPort: await getAvailablePort(),
      },
    },
  }
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
  // circuit breaker: if the app already crashed on launch earlier in this run,
  // it is not going to launch now either. fail instantly instead of relaunching
  // a known-broken bundle across every remaining test.
  if (getRecordedCrash()) {
    // keep this short — the full crash diagnostics were already logged by the
    // first failure. repeating them for every skipped test floods the log.
    throw new AppCrashedError(
      `app already crashed on launch earlier in this run (see first failure for the crash log) — skipping to save CI time`
    )
  }

  const resolvedConfig = await config
  let lastError: unknown

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 1) {
        console.info(`[createSession] attempt ${attempt}/${maxRetries}`)
        await recoverSimulator(resolvedConfig)
      }

      const sessionConfig = await withFreshWdaLocalPort(resolvedConfig)
      const driver = await remote(sessionConfig)

      // verify the app actually launched successfully
      await assertAppRunning(driver)

      return driver
    } catch (err) {
      lastError = err

      // a crash-on-launch is deterministic — retrying just wastes time.
      // record it so every subsequent session in the run fails instantly, dump
      // diagnostics, and bail out of the retry loop immediately.
      if (err instanceof AppCrashedError) {
        const crashLog = dumpSimulatorCrashLog(resolvedConfig)
        const reason = crashLog ? `${err.message}\n\n${crashLog}` : err.message
        recordCrash(reason)
        console.error(
          `[createSession] app crashed immediately after launch — not retrying (deterministic)`
        )
        if (crashLog) {
          console.error('[createSession] simulator crash log:\n' + crashLog)
        }
        throw err
      }

      const msg = err instanceof Error ? err.message : String(err)
      console.warn(`[createSession] attempt ${attempt}/${maxRetries} failed: ${msg}`)
    }
  }

  throw lastError
}

/** dump diagnostics around an app crash so the failure is self-explaining. */
function dumpSimulatorCrashLog(config: WebdriverIOConfig): string | null {
  const opts = (config.capabilities as any)?.['appium:options'] || {}
  const udid = opts.udid || process.env.SIMULATOR_UDID
  const bundleId = opts.bundleId || 'dev.onestack.rntestcontainer'
  if (!udid) return null

  const parts: string[] = []

  // relaunch the app attached to a console — a JS/Hermes fatal (e.g. "Wrong
  // bytecode version") prints to the app's stdout/stderr, which `log show` does
  // not capture. the app crashes on launch, so this returns right away.
  try {
    execSync(`xcrun simctl terminate ${udid} ${bundleId} 2>/dev/null || true`, {
      timeout: 10_000,
    })
    const consoleOut = execSync(
      `xcrun simctl launch --console-pty ${udid} ${bundleId} 2>&1 | head -200`,
      { timeout: 30_000, encoding: 'utf8' }
    )
    const trimmed = consoleOut.trim()
    if (trimmed) parts.push('app console on relaunch:\n' + trimmed)
  } catch (e) {
    // execSync throws if the launch is killed by the timeout (app didn't crash
    // this time) — keep any stdout it captured before dying.
    const out = (e as any)?.stdout
    if (out) parts.push('app console on relaunch:\n' + String(out).trim())
  }

  // the real reason for a *native* crash (segfault/abort, no JS exception
  // printed) lives in the crash report, not the console. grab the newest one.
  const ips = readLatestCrashReport()
  if (ips) parts.push('crash report:\n' + ips)

  // system-level fallback (signals / runningboard kills)
  try {
    const log = execSync(
      `xcrun simctl spawn ${udid} log show --predicate 'process == "RNTestContainer" OR subsystem == "com.apple.CrashReporter"' --last 60s --style compact 2>/dev/null || true`,
      { timeout: 15_000, encoding: 'utf8' }
    )
    const trimmed = log.trim()
    if (trimmed) parts.push('simulator log:\n' + trimmed.slice(0, 2000))
  } catch {}

  const out = parts.join('\n\n')
  return out ? out.slice(0, 9000) : null
}

/** read the newest RNTestContainer crash report (.ips) written by the OS. */
function readLatestCrashReport(): string | null {
  const dir = path.join(os.homedir(), 'Library', 'Logs', 'DiagnosticReports')
  try {
    const reports = fs
      .readdirSync(dir)
      .filter((f) => f.startsWith('RNTestContainer') && f.endsWith('.ips'))
      .map((f) => {
        const full = path.join(dir, f)
        return { full, mtime: fs.statSync(full).mtimeMs }
      })
      .sort((a, b) => b.mtime - a.mtime)
    if (!reports.length) return null
    // .ips files are large json — the crash reason + faulting thread is at the
    // top, so the first chunk is what matters.
    return fs.readFileSync(reports[0].full, 'utf8').slice(0, 4000)
  } catch {
    return null
  }
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
  const appiumOptions = (config.capabilities as any)?.['appium:options'] || {}
  const udid = appiumOptions.udid || process.env.SIMULATOR_UDID
  const bundleId = appiumOptions.bundleId || 'dev.onestack.rntestcontainer'
  if (udid && bundleId) {
    try {
      // terminate the configured test app if it is stuck
      execSync(`xcrun simctl terminate ${udid} ${bundleId} 2>/dev/null || true`, {
        timeout: 10_000,
      })
    } catch {}
  }

  // brief pause for system recovery
  await new Promise((r) => setTimeout(r, 3000))
}
