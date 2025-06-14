import { resolvePath } from '@vxrn/resolve'
import { detectPackageManager, type PackageManagerName } from '@vxrn/utils'
import FSExtra from 'fs-extra'
import path from 'node:path'
import colors from 'picocolors'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'
import { generateForPlatform } from './prebuildWithoutExpo'

export const prebuild = async ({
  root,
  platform,
  'no-install': noInstall = false,
  expo = true,
}: {
  root: string
  platform?: 'ios' | 'android' | string
  'no-install'?: boolean
  expo: boolean
}) => {
  const options = await fillOptions({ root })

  await applyBuiltInPatches(options)

  const doesIOSExist = FSExtra.existsSync(path.resolve('ios'))
  const doesAndroidExist = FSExtra.existsSync(path.resolve('android'))

  if (expo) {
    try {
      // Import Expo from the user's project instead of from where vxrn is installed, since vxrn may be installed globally or at the root workspace.
      const importPath = resolvePath('@expo/cli/build/src/prebuild/index.js', root)
      const expoPrebuild = (await import(importPath)).default.expoPrebuild
      await expoPrebuild([
        ...(platform ? ['--platform', platform] : []),
        ...(noInstall ? ['--no-install'] : []),
        '--skip-dependency-update',
        'react,react-native,expo',
      ])
      try {
        const packageJsonPath = path.join(root, 'package.json')
        let packageJsonContents = await FSExtra.readFile(packageJsonPath, 'utf8')

        packageJsonContents = packageJsonContents.replace(/expo run:ios/g, 'one run:ios')
        packageJsonContents = packageJsonContents.replace(/expo run:android/g, 'one run:android')

        await FSExtra.writeFile(packageJsonPath, packageJsonContents, 'utf8')
      } catch (error) {
        console.error('Error updating package.json', error)
      }
      // Remove the ios/.xcode.env.local file as it's causing problems `node: No such file or directory` during build
      try {
        FSExtra.removeSync(path.join(root, 'ios', '.xcode.env.local'))
      } catch (e) {
        // ignore
      }
    } catch (e) {
      throw new Error(
        `Failed to prebuild native project: ${e}\nIs "expo" listed in your dependencies?`
      )
    }

    if (!platform || platform === 'ios') {
      console.info(
        `
iOS:

 Run \`open ios/*.xcworkspace\` in your terminal to open the prebuilt iOS project.
 Then you can either run it via Xcode or archive it for distribution.

 See https://onestack.dev/docs/guides-ios-native for more information.

---
`
      )
    }
  } else {
    try {
      const packageJsonPath = path.join(root, 'package.json')
      let packageJsonContents = await FSExtra.readFile(packageJsonPath, 'utf8')
      let { devDependencies } = JSON.parse(packageJsonContents)
      if (!devDependencies['@react-native-community/template']) {
        const installCommand: `${PackageManagerName} ${'add' | 'install'} ${'-D'} ${'@react-native-community/template'}` =
          await (async () => {
            const found = await detectPackageManager()
            switch (true) {
              case found.bun:
                return `bun add -D @react-native-community/template`
              case found.pnpm:
                return `pnpm install -D @react-native-community/template`
              case found.yarn:
                return `yarn add -D @react-native-community/template`
              default:
                return `npm install -D @react-native-community/template`
            }
          })()
        throw new Error(
          '"@react-native-community/template" is not found in package.json, please install "@react-native-community/template" as dev dependency:\n' +
            `\`${installCommand}\``
        )
      }
    } catch (error) {
      throw new Error('package.json checks are failing:\n' + error)
    }

    // any because we don't have access react-native config
    let appConfig: any
    try {
      const appConfigPath = path.resolve('app.json')
      const appConfigContents = await FSExtra.readFile(appConfigPath, 'utf8')
      appConfig = JSON.parse(appConfigContents)
    } catch (error) {
      throw new Error('app.json checks are failing:\n' + error)
    }
    if (platform == 'ios' || !platform) {
      if (!doesIOSExist) {
        await generateForPlatform(root, 'ios', appConfig)
      } else {
        console.error('ios/ folder already exists')
      }
    }
    if (platform == 'android' || !platform) {
      if (!doesAndroidExist) {
        await generateForPlatform(root, 'android', appConfig)
      } else {
        console.error('android/ folder already exists')
      }
    }
    if (!platform || platform === 'ios') {
      console.info(`Run cd ios && pod install`)
      console.info(
        'Then run `open *.xcworkspace` in your terminal to open the prebuilt iOS project, then you can either run it via Xcode or archive it for distribution.'
      )
    }
  }
  if (!platform || platform === 'android') {
    console.info(
      `
Android:

  \`cd android\` then \`./gradlew assembleRelease\` or \`./gradlew assembleDebug\` to build the Android project.

  Afterwards, you can find the built APK at \`android/app/build/outputs/apk/release/app-release.apk\` or
  \`android/app/build/outputs/apk/debug/app-debug.apk\`.

`
    )
  }

  // huh... i needed this, then i didnt, for no apparent reason
  // automatically fix build scripts for monorepos
  // const reactNativeRoot = resolvePath('react-native', root)
  // // in a monorepo if react-native is at root and current app is at apps/app
  // // then this value will be "../..", if not it will be ""
  // const monorepoRelativeRoot = relative(root, reactNativeRoot)
  //   .split(sep)
  //   .filter((x) => x === '..')
  //   .join(sep)

  // if (monorepoRelativeRoot) {
  //   if (existsSync('ios')) {
  //     const projectName = findXcworkspaceName('ios')?.replace('.xcworkspace', '')
  //     if (projectName) {
  //       // note: this is for older react-native, needs testing
  //       await replaceInUTF8File(
  //         `ios/${projectName}.xcodeproj/project.pbxproj`,
  //         '../node_modules/react-native/scripts/',
  //         `${monorepoRelativeRoot}/../node_modules/react-native/scripts/`
  //       )
  //       await replaceInUTF8File(
  //         `ios/Pods/Pods.xcodeproj/project.pbxproj`,
  //         `RCT_SCRIPT_POD_INSTALLATION_ROOT/../../../node_modules/react-native`,
  //         `RCT_SCRIPT_POD_INSTALLATION_ROOT/${monorepoRelativeRoot}/../../../node_modules/react-native`
  //       )
  //     }
  //   }

  //   if (existsSync('android')) {
  //     // TODO test this, leaving commented out since its likely not working
  //     // await replaceInUTF8File(
  //     //   'android/app/build.gradle',
  //     //   '../../node_modules/',
  //     //   `${monorepoRelativeRoot}/../../node_modules/`
  //     // )
  //     // await replaceInUTF8File(
  //     //   'android/settings.gradle',
  //     //   '../node_modules/',
  //     //   `${monorepoRelativeRoot}/../node_modules/`
  //     // )
  //   }

  //   console.info(`Note: detected monorepo and build adjusted scripts.`)
  // }

  // See: https://github.com/facebook/react-native/pull/45464
  try {
    resolvePath('@react-native-community/cli', root)
  } catch (e) {
    if (isMissingCliDependency(e)) {
      warnMissingCliDependency()
    } else {
      throw e
    }
  }
}

function isMissingCliDependency(error) {
  return error.code === 'MODULE_NOT_FOUND' && /@react-native-community\/cli/.test(error.message)
}

function warnMissingCliDependency() {
  console.warn(`
${colors.red('⚠')}️ To build the app, ${colors.dim('react-native')} depends on ${colors.dim('@react-native-community/cli')} for cli commands. Please update your ${colors.dim('package.json')} to include:
${colors.white(
  colors.bold(`
  "devDependencies": {
    "@react-native-community/cli": "latest",
  }`)
)}`)
}

export async function replaceInUTF8File(filePath: string, findThis: string, replaceWith: string) {
  const fileContent = await FSExtra.readFile(filePath, 'utf8')
  const replacedFileContent = fileContent.replace(findThis, replaceWith)
  if (fileContent !== replacedFileContent) {
    await FSExtra.writeFile(filePath, replacedFileContent, 'utf8')
  }
}

// Function to find the name of the .xcworkspace
function findXcworkspaceName(directory: string): string | null {
  const files = FSExtra.readdirSync(directory)
  for (const file of files) {
    if (file.endsWith('.xcworkspace')) {
      return file
    }
  }
  return null
}
