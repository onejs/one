import { beforeAll, describe, expect, inject, it, test } from 'vitest'
import { copy, copySync, ensureDirSync, move, pathExists } from 'fs-extra'
import type { remote } from 'webdriverio'
import { execSync } from 'node:child_process'
import path from 'node:path'

let hasSetup = false

async function setup() {
  const root = process.cwd()
  const tmpDir = path.join(root, 'node_modules', '.test')
  ensureDirSync(tmpDir)

  if (!process.env.TEST_CONTAINER_PATH) {
    throw new Error('No TEST_CONTAINER_PATH provided')
  }

  const appPath = path.join(tmpDir, 'ios-test-container-prod.app' /* TODO: dev */)

  copySync(
    process.env.TEST_CONTAINER_PATH,
    appPath
  )

  // Need to pipe the output to the console
  execSync(`yarn react-native bundle --platform ios --dev false --bundle-output ${appPath}/main.jsbundle --assets-dest ${appPath}`, { stdio: 'inherit' })
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

type WebdriverIOConfig = Parameters<typeof remote>[0]

function getWebDriverOpts(): WebdriverIOConfig {
  const capabilities = {
    platformName: 'iOS',
    'appium:options': {
      automationName: 'XCUITest',

      // deviceName: 'iPhone mini 2',
      udid: getSimulatorUdid(),

      app: process.env.TEST_CONTAINER_PATH,
      // app: '/Users/z/Downloads/ios-test-container-prod.app',
      // bundleId: 'host.exp.Exponent',

      // Do not reset the simulator
      // noReset: true,
    },
  }

  const wdOpts = {
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: process.env.APPIUM_PORT ? Number.parseInt(process.env.APPIUM_PORT, 10) : 4723,
    connectionRetryTimeout: 5 * 60 * 1000,
    connectionRetryCount: 3,
    logLevel: 'info' as const,
    capabilities,
  } satisfies WebdriverIOConfig

  return wdOpts
}

describe('Native Test Test', () => {
  test('should pass', () => {
    getWebDriverOpts()
    expect(true).toBe(true)
    console.log(process.cwd())
    setup()
  })

  // test('hello world', async () => {
  //   const driver = await remote(getWebDriverOpts())
  //   // console.log(JSON.stringify(driver.commandList))
  //   // driver.executeScript('mobile: terminateApp', [{ bundleId: 'host.exp.Exponent' }])
  //   // driver.executeScript('mobile: launchApp', [{ bundleId: 'host.exp.Exponent' }])

  //   // const screenShot = await driver.takeScreenshot()
  //   // console.log('screenShot', screenShot)
  //   await driver.saveScreenshot('./screenshot.png')

  //   // Select with accessibility id
  //   const element = driver.$('~hello-word')

  //   // expect element to contain text "Hello, World!"
  //   const text = await element.getText()
  //   expect(text).toBe('Hello One!')

  //   // const settingsItem = await driver.$('//*[@text="Settings"]');
  //   // await settingsItem.click();
  // }, 10 * 60 * 1000)

  // test('hello world 2', async () => {
  //   const driver = await remote(getWebDriverOpts())
  //   // console.log(JSON.stringify(driver.commandList))
  //   // driver.executeScript('mobile: terminateApp', [{ bundleId: 'host.exp.Exponent' }])
  //   // driver.executeScript('mobile: launchApp', [{ bundleId: 'host.exp.Exponent' }])

  //   // const screenShot = await driver.takeScreenshot()
  //   // console.log('screenShot', screenShot)
  //   await driver.saveScreenshot('./screenshot.png')

  //   // Select with accessibility id
  //   const element = driver.$('~hello-word')

  //   // expect element to contain text "Hello, World!"
  //   const text = await element.getText()
  //   expect(text).toBe('Hello One!')

  //   // const settingsItem = await driver.$('//*[@text="Settings"]');
  //   // await settingsItem.click();
  // }, 10 * 60 * 1000)
})
