import { execSync } from 'node:child_process'
import { afterAll, afterEach, beforeAll, expect, test } from 'vitest'
import { remote } from 'webdriverio'
import { editComponentFile, editRouteFile, revertEditedFiles } from './utils'

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

      udid: getSimulatorUdid(),

      app: process.env.TEST_CONTAINER_PATH,
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

beforeAll(async () => {
  revertEditedFiles()
})

afterEach(async () => {
  revertEditedFiles()
})

test('component HMR', async () => {
  const driver = await remote(getWebDriverOpts())

  const textInput = driver.$('~text-input')
  await textInput.waitForDisplayed({ timeout: 2 * 60 * 1000 })
  await textInput.setValue('app did not reload')
  expect(await textInput.getValue()).toBe('app did not reload')


  const textElementInComponent = driver.$('~component-text-content')
  expect(await textElementInComponent.getText()).toBe('Some text')

  editComponentFile()

  const result = await driver.waitUntil(
    async () => {
      const element = await driver.$('~component-text-content')
      return element && (await element.getText()) === 'Some edited text in component file'
    },
    { timeout: 10 * 1000 }
  )
  expect(result).toBe(true)

  expect(await textInput.getValue()).toBe('app did not reload')
}, 5 * 60 * 1000)
