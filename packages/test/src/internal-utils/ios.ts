import { execFileSync, execSync } from 'node:child_process'
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

    const ios18Runtimes = runtimes.filter(
      (r) => typeof r === 'string' && r.includes('SimRuntime.iOS-18')
    )

    if (!ios18Runtimes.length) {
      throw new Error(`No available runtime found from ${JSON.stringify(runtimes)}`)
    }

    // find the first runtime that actually has the target device
    let runtime: string | undefined
    let device: any
    for (const r of ios18Runtimes) {
      device = devicesData[r].find((d: any) => d.name.includes('iPhone 16 Pro'))
      if (device) {
        runtime = r as string
        break
      }
    }

    if (!runtime) {
      // fallback: find any iPhone in any iOS 18 runtime
      for (const r of ios18Runtimes) {
        device = devicesData[r].find((d: any) => d.name.includes('iPhone'))
        if (device) {
          runtime = r as string
          break
        }
      }
    }

    if (!device) {
      throw new Error(
        `No iPhone device found in iOS 18 runtimes: ${JSON.stringify(ios18Runtimes)}`
      )
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

function getBundleIdFromApp(appPath: string) {
  const infoPlistPath = path.join(appPath, 'Info.plist')

  try {
    return execFileSync(
      'plutil',
      ['-extract', 'CFBundleIdentifier', 'raw', '-o', '-', infoPlistPath],
      { encoding: 'utf8' }
    ).trim()
  } catch (error) {
    if (error instanceof Error) {
      error.message = `Failed to read CFBundleIdentifier from ${infoPlistPath}: ${error.message}`
    }

    throw error
  }
}

function ensureSimulatorBooted(udid: string) {
  try {
    execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], {
      stdio: 'ignore',
    })
    return
  } catch (error) {
    // simulator is not booted yet
  }

  execFileSync('xcrun', ['simctl', 'boot', udid], {
    stdio: 'inherit',
  })

  execFileSync('xcrun', ['simctl', 'bootstatus', udid, '-b'], {
    stdio: 'inherit',
  })
}

function installPreparedAppToSimulator({
  appPath,
  bundleId,
  udid,
}: {
  appPath: string
  bundleId: string
  udid: string
}) {
  console.info(`Installing ${bundleId} to simulator ${udid} from ${appPath}...`)

  ensureSimulatorBooted(udid)

  try {
    execFileSync('xcrun', ['simctl', 'terminate', udid, bundleId], {
      stdio: 'ignore',
    })
  } catch {}

  try {
    execFileSync('xcrun', ['simctl', 'uninstall', udid, bundleId], {
      stdio: 'ignore',
    })
  } catch {}

  execFileSync('xcrun', ['simctl', 'install', udid, appPath], {
    stdio: 'inherit',
  })
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

async function ensureReactNativeBundleConfig(root: string) {
  const fs = await import('node:fs')
  const existingConfigPath = ['react-native.config.cjs', 'react-native.config.js'].find(
    (fileName) => fs.existsSync(path.join(root, fileName))
  )

  if (existingConfigPath) {
    return async () => {}
  }

  const generatedConfigPath = path.join(root, 'react-native.config.cjs')

  await fs.promises.writeFile(
    generatedConfigPath,
    `module.exports = {
  // allow test bundling to route through vxrn without per-app scaffolding.
  commands: [...require('vxrn/react-native-commands')],
}
`
  )

  return async () => {
    await fs.promises.rm(generatedConfigPath, { force: true })
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
      console.info(
        `TIP: You can \`export ${envName}='${testAppPath}'\` to speed up this process.`
      )

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
            reject(
              new Error(
                `Expo manifest request didn't get respond within the expected time.`
              )
            )
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
            const body = await response.text().catch(() => '')
            console.error(
              `Bundle request returned ${response.status}: ${body.slice(0, 500)}`
            )
            throw new Error(`${response.status}`)
          }
        } catch (error) {
          if (retries >= 30) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            reject(
              new Error(
                `${bundleUrl} didn't respond within the expected time. (${errorMsg})`
              )
            )
          } else {
            retries++
            setTimeout(checkUrl, 2000)
          }
        }
      }
      checkUrl()
    })

    return appPath
  } // End of `TEST_ENV === 'dev'`

  // Prod
  // Build prod bundle and replace it in the app
  // The bundle must be compiled to Hermes bytecode since the Release app is built with Hermes enabled

  $.cwd = root
  await $({
    stdio: 'inherit',
  })`bun one patch` // Ensure patches are applied.

  // First, bundle the JS to a temporary file
  const jsBundlePath = `${appPath}/main.jsbundle.js`
  const cleanupReactNativeBundleConfig = await ensureReactNativeBundleConfig(root)

  // [WR-B3ATY2VK] Vitest also loads `.env` and `.env.*`, and it loads with
  // MODE=test, also it exposes those env to underlying shell processes, which
  // those explicit env vars will override Vite loading `.env` and `.env.*`,
  // making some of our test fail because env vars are not loaded correctly.
  // So we need to use `env -u` to unset MODE and any env vars we care here.
  try {
    await $({
      stdio: 'inherit',
    })`env -u MODE -u VITE_TEST_ENV_MODE ONE_SERVER_URL=http://localhost:3456 bun react-native bundle --platform ios --dev false --bundle-output ${jsBundlePath} --assets-dest ${appPath}`
  } finally {
    await cleanupReactNativeBundleConfig()
  }

  // Compile the JS bundle to Hermes bytecode
  // The app is built with Hermes V1 (RCT_HERMES_V1_ENABLED=1) which uses a different
  // bytecode version (v98) than the hermes-compiler npm package (v96).
  // We must use the hermesc built from source alongside the app to match.
  const fs = await import('node:fs')

  const __filename_ios = fileURLToPath(import.meta.url)
  const __dirname_ios = dirname(__filename_ios)
  const testContainerProjectPath = path.join(
    __dirname_ios,
    '..',
    '..',
    '..',
    '..',
    'tests',
    'rn-test-container'
  )

  const possibleHermescPaths = [
    // explicit override (CI caches the V1 hermesc from the build step)
    ...(process.env.HERMESC_PATH ? [process.env.HERMESC_PATH] : []),
    // Hermes V1 source-built hermesc in rn-test-container Pods
    path.join(
      testContainerProjectPath,
      'ios',
      'Pods',
      'hermes-engine',
      'destroot',
      'bin',
      'hermesc'
    ),
    path.join(root, 'ios', 'Pods', 'hermes-engine', 'destroot', 'bin', 'hermesc'),
    // hermes-compiler npm package (only works if app wasn't built with V1)
    path.join(root, 'node_modules', 'hermes-compiler', 'hermesc', 'osx-bin', 'hermesc'),
    path.join(
      root,
      '..',
      '..',
      'node_modules',
      'hermes-compiler',
      'hermesc',
      'osx-bin',
      'hermesc'
    ),
    path.join(
      root,
      'node_modules',
      'react-native',
      'sdks',
      'hermesc',
      'osx-bin',
      'hermesc'
    ),
    path.join(
      root,
      '..',
      '..',
      'node_modules',
      'react-native',
      'sdks',
      'hermesc',
      'osx-bin',
      'hermesc'
    ),
  ]

  let hermescPath: string | undefined
  for (const p of possibleHermescPaths) {
    if (fs.existsSync(p)) {
      hermescPath = p
      break
    }
  }

  if (!hermescPath) {
    throw new Error(
      `Could not find hermesc at any of: ${possibleHermescPaths.join(', ')}`
    )
  }

  const hbcBundlePath = `${appPath}/main.jsbundle`

  console.info(`Compiling bundle with Hermes: ${hermescPath}`)
  // -O flag enables optimizations for production builds (same as react-native-xcode.sh)
  await $({
    stdio: 'inherit',
  })`${hermescPath} -emit-binary -max-diagnostic-width=80 -O -out ${hbcBundlePath} ${jsBundlePath}`

  // Clean up the intermediate JS bundle
  await $`rm -f ${jsBundlePath}`

  // Re-sign the app after modifying the bundle
  // The app was signed when built, but modifying files invalidates the signature
  console.info('Re-signing app after bundle replacement...')
  await $({
    stdio: 'inherit',
  })`codesign --force --sign - ${appPath}`

  return appPath
}

export async function getWebDriverConfig(): Promise<WebdriverIOConfig> {
  const wdaDerivedDataPath = '/tmp/wda-build'
  const fs = await import('node:fs')
  const wdaIsPrebuilt = fs.existsSync(
    `${wdaDerivedDataPath}/Build/Products/Debug-iphonesimulator/WebDriverAgentRunner-Runner.app`
  )
  const udid = getSimulatorUdid()
  const appPath = await prepareTestApp()
  const bundleId = getBundleIdFromApp(appPath)
  const wdaLocalPort = await getAvailablePort()

  installPreparedAppToSimulator({
    appPath,
    bundleId,
    udid,
  })

  const capabilities = {
    platformName: 'iOS',
    'appium:options': {
      automationName: 'XCUITest',
      udid,
      bundleId,
      wdaLocalPort,
      // always cache WDA builds so subsequent sessions skip the rebuild
      derivedDataPath: wdaDerivedDataPath,
      ...(wdaIsPrebuilt && { usePrebuiltWDA: true }),
    },
  }

  const wdOpts = {
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: process.env.APPIUM_PORT ? Number.parseInt(process.env.APPIUM_PORT, 10) : 4723,
    connectionRetryTimeout: 240 * 1000,
    connectionRetryCount: 3,
    logLevel: 'warn' as const,
    capabilities,
  } satisfies WebdriverIOConfig

  return wdOpts
}
