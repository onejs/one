// TODO: Move this into a shared package

import { execSync } from 'node:child_process'
import path from 'node:path'
import { copySync, ensureDirSync } from 'fs-extra'
import type { Environment } from 'vitest/environments'
import type { remote } from 'webdriverio'

type WebdriverIOConfig = Parameters<typeof remote>[0]

export default (<Environment>{
  name: 'native',
  transformMode: 'ssr',
  async setup(global) {
    const webDriverConfig = await _internal_getWebDriverConfig()
    global.webDriverConfig = webDriverConfig

    return {
      teardown() {
        // called after all tests with this env have been run
      },
    }
  },
})

export function getWebDriverConfig(): WebdriverIOConfig {
  const { webDriverConfig } = global as any

  if (!webDriverConfig) {
    throw new Error(
      'Cannot get webDriverConfig. Did you add `// @vitest-environment native` in your test file?'
    )
  }

  return webDriverConfig
}

function getSimulatorUdid() {
  if (process.env.SIMULATOR_UDID) {
    return process.env.SIMULATOR_UDID
  }

  console.warn('No SIMULATOR_UDID provided, trying to find a simulator automatically...')

  try {
    const listDevicesOutput = execSync('xcrun simctl list --json devices').toString()

    const devicesData = JSON.parse(listDevicesOutput).devices

    const runtimes = Reflect.ownKeys(devicesData)

    const runtime = runtimes.find((r) => typeof r === 'string' && r.includes('SimRuntime.iOS-18'))

    if (!runtime) {
      throw new Error(`No available runtime found from ${JSON.stringify(runtimes)}`)
    }

    const device = devicesData[runtime].find((d) => d.name.includes('iPhone 16 Pro'))

    if (!device) {
      throw new Error(`No available device found from ${JSON.stringify(devicesData[runtime])}`)
    }

    console.info(`Found simulator device ${device.name} with udid ${device.udid}`)

    return device.udid
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Failed to find an available simulator: ${error.message}`
    }

    throw error
  }
}

async function prepareTestApp() {
  if (!process.env.TEST_CONTAINER_PATH) {
    throw new Error('No TEST_CONTAINER_PATH provided, this is required for now')
  }

  const root = process.cwd()
  const tmpDir = path.join(root, 'node_modules', '.test')
  ensureDirSync(tmpDir)

  const isDev = true

  const appPath = path.join(tmpDir, `ios-test-container-${isDev ? 'dev' : 'prod'}.app`)
  copySync(process.env.TEST_CONTAINER_PATH, appPath)

  if (isDev) {
    // TODO: Dynamically set the bundle URL in the app

    // Since the initial bundle may take some time to build, we poke it first and make sure it's ready before running tests, which removes some flakiness during Appium tests.
    const bundleUrl = `http://127.0.0.1:8081/index.bundle?platform=ios`
    await new Promise<void>((resolve, reject) => {
      const startedAt = performance.now()
      let retries = 0
      const checkUrl = async () => {
        try {
          const response = await fetch(bundleUrl)
          if (response.ok) {
            console.info(
              `Initial RN bundle served after ${Math.round(performance.now() - startedAt)}ms`
            )
            resolve()
          } else {
            throw new Error('not ready')
          }
        } catch (error) {
          if (retries >= 5) {
            reject(new Error(`${bundleUrl} didn't respond within the expected time.`))
          } else {
            retries++
            setTimeout(checkUrl, 1000)
          }
        }
      }
      checkUrl()
    })

    return appPath
  }

  // Prod
  // TODO: Build prod bundle and replace it in the app
  return appPath
}

async function _internal_getWebDriverConfig(): Promise<WebdriverIOConfig> {
  const capabilities = {
    platformName: 'iOS',
    'appium:options': {
      automationName: 'XCUITest',

      udid: getSimulatorUdid(),

      app: await prepareTestApp(),
    },
  }

  const wdOpts = {
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: process.env.APPIUM_PORT ? Number.parseInt(process.env.APPIUM_PORT, 10) : 4723,
    connectionRetryTimeout: 5 * 60 * 1000,
    connectionRetryCount: 3,
    logLevel: 'warn' as const,
    capabilities,
  } satisfies WebdriverIOConfig

  return wdOpts
}
