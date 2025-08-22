import { exec, execSync } from 'node:child_process'
import path, { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { dirname } from 'node:path'
import { copySync, ensureDirSync } from 'fs-extra'
import type { Environment } from 'vitest/environments'
import type { remote } from 'webdriverio'
import { $ } from 'zx'
import { TEST_ENV } from '../constants'
import { findIosBuiltAppFromXcode } from './findIosBuiltAppFromXcode'

export type WebdriverIOConfig = Parameters<typeof remote>[0]

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
  const copyTestContainerFrom = (() => {
    const envName = `IOS_TEST_CONTAINER_PATH_${TEST_ENV.toUpperCase()}`

    if (process.env[envName]) {
      return process.env[envName]
    }

    console.info(`No ${envName} provided, trying to find a built app automatically...`)

    try {
      const __filename = fileURLToPath(import.meta.url)
      const __dirname = dirname(__filename)

      const testContainerProjectPath = path.join(
        __dirname,
        '..',
        '..',
        '..',
        '..',
        'tests',
        'rn-test-container'
      )

      const testAppPath = findIosBuiltAppFromXcode(
        testContainerProjectPath,
        TEST_ENV === 'dev' ? 'Debug' : 'Release'
      )

      console.info(`Using built app from Xcode: ${testAppPath}`)
      console.info(`TIP: You can \`export ${envName}='${testAppPath}'\` to speed up this process.`)

      return testAppPath
    } catch (e) {
      if (e instanceof Error) {
        e.message = `Failed to find a built app. Please set ${envName}, or try to build the app from Xcode: ${e.message}.`
      }
      throw e
    }
  })()

  const root = process.cwd()
  const tmpDir = path.join(root, 'node_modules', '.test')
  ensureDirSync(tmpDir)

  const appPath = path.join(tmpDir, `ios-test-container-${TEST_ENV}.app`)
  copySync(copyTestContainerFrom, appPath)

  if (TEST_ENV === 'dev') {
    // TODO: Dynamically set the server URL in the app

    const serverUrl = `http://127.0.0.1:8081`

    // Since the initial bundle may take some time to build, we poke it first and make sure it's ready before running tests, which removes some flakiness during Appium tests.
    console.info(`Checking dev server ${serverUrl}...`)
    const startedAt = performance.now()
    const bundleUrl = await new Promise<string>((resolve, reject) => {
      let retries = 0
      const checkUrl = async () => {
        try {
          const response = await fetch(serverUrl, {
            method: 'GET',
            headers: {
              'Expo-Platform': 'ios',
            },
          })
          if (response.ok) {
            const json = await response.json()
            resolve(json.launchAsset.url)
          } else {
            throw new Error(`${response.status}`)
          }
        } catch (error) {
          if (retries >= 5) {
            reject(new Error(`Expo manifest request didn't get respond within the expected time.`))
          } else {
            retries++
            setTimeout(checkUrl, 1000)
          }
        }
      }
      checkUrl()
    })
    console.info(`Waiting for the initial RN bundle to be ready from ${bundleUrl}...`)
    await new Promise<void>((resolve, reject) => {
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
            throw new Error(`${response.status}`)
          }
        } catch (error) {
          if (retries >= 5) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            reject(new Error(`${bundleUrl} didn't respond within the expected time. (${errorMsg})`))
          } else {
            retries++
            setTimeout(checkUrl, 1000)
          }
        }
      }
      checkUrl()
    })

    return appPath
  } // End of `TEST_ENV === 'dev'`

  // Prod
  // Build prod bundle and replace it in the app

  // Not working, this will make the app hang with a blank white screen, idk why but if we use zx it works.
  // await execSync(`rm -f ${appPath}/main.jsbundle`, { cwd: root })
  // await execSync(
  //   `yarn react-native bundle --platform ios --dev false --bundle-output ${appPath}/main.jsbundle --assets-dest ${appPath}`,
  //   { cwd: root }
  // )

  $.cwd = root
  await $({
    stdio: 'inherit',
  })`yarn one patch` // Ensure patches are applied.

  // [WR-B3ATY2VK] Vitest also loads `.env` and `.env.*`, and it loads with
  // MODE=test, also it exposes those env to underlying shell processes, which
  // those explicit env vars will override Vite loading `.env` and `.env.*`,
  // making some of our test fail because env vars are not loaded correctly.
  // So we need to use `env -u` to unset MODE and any env vars we care here.
  await $({
    stdio: 'inherit',
  })`env -u MODE -u VITE_TEST_ENV_MODE yarn react-native bundle --platform ios --dev false --bundle-output ${appPath}/main.jsbundle --assets-dest ${appPath}`
  await new Promise((resolve) => {
    setTimeout(resolve, 1000)
  })
  return appPath
}

export async function getWebDriverConfig(): Promise<WebdriverIOConfig> {
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
