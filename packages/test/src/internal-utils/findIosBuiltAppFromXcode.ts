import { execSync } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { join, parse } from 'node:path'

export function findIosBuiltAppFromXcode(projectRoot: string, buildConfig: 'Debug' | 'Release') {
  const { workspace, scheme } = findXcworkspaceAndScheme(projectRoot)

  const buildSettings = (() => {
    try {
      return execSync(
        `xcodebuild -workspace ${workspace} -scheme ${scheme} -showBuildSettings 2>&1`,
        { cwd: projectRoot }
      ).toString()
    } catch (e) {
      if (e instanceof Error) {
        e.message +=
          ' - please make sure you have built the iOS app before running the tests (`npx expo prebuild --platform ios`, `open ios/*.xcworkspace`, and run the app on a simulator at least once).'
      }

      throw e
    }
  })()

  const buildDirLine = buildSettings.split('\n').find((line) => line.includes('BUILD_DIR'))

  if (!buildDirLine) {
    throw new Error('Cannot find BUILD_DIR from Xcode project.')
  }

  const buildDir = buildDirLine.split('=')[1].trim()

  const appPath = `${buildDir}/${buildConfig}-iphonesimulator/${scheme}.app`

  console.info(`Using built app: ${appPath}`)

  if (!existsSync(appPath)) {
    throw new Error(
      `Cannot find the app at ${appPath}. Please make sure you have built the iOS app before running the tests.` +
        ' You can `open ios/*.xcworkspace` and run the app on a simulator at least once.'
    )
  }

  return appPath
}

function findXcworkspaceAndScheme(projectRoot: string): { workspace: string; scheme: string } {
  const iosDir = join(projectRoot, 'ios')
  const files = readdirSync(iosDir)
  const workspaceFile = files.find((f) => f.endsWith('.xcworkspace'))

  if (!workspaceFile) {
    throw new Error('No .xcworkspace file found in ios directory.')
  }

  const workspace = join('ios', workspaceFile)
  const scheme = parse(workspaceFile).name // remove .xcworkspace extension

  return { workspace, scheme }
}
