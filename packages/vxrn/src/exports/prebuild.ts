import path from 'node:path'
import FSExtra from 'fs-extra'
import { fillOptions } from '../utils/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'
import { detectPackageManager, PackageManagerName } from '@vxrn/utils'
import { generateForPlatform } from './prebuildWithoutExpo'

export const prebuild = async ({
  root,
  platform,
  expo = true,
}: { root: string; platform?: 'ios' | 'android' | string; expo: boolean }) => {
  const options = await fillOptions({ root })

  applyBuiltInPatches(options).catch((err) => {
    console.error(`\n 🥺 error applying built-in patches`, err)
  })
  const doesIOSExist = FSExtra.existsSync(path.resolve('ios'))
  const doesAndroidExist = FSExtra.existsSync(path.resolve('android'))

  if (expo) {
    try {
      // Import Expo from the user's project instead of from where vxrn is installed, since vxrn may be installed globally or at the root workspace.
      const importPath = require.resolve('@expo/cli/build/src/prebuild/index.js', {
        paths: [root],
      })
      const expoPrebuild = (await import(importPath)).default.expoPrebuild
      await expoPrebuild([
        ...(platform ? ['--platform', platform] : []),
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
        'Run `open ios/*.xcworkspace` in your terminal to open the prebuilt iOS project, then you can either run it via Xcode or archive it for distribution.'
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
      '`cd android` then `./gradlew assembleRelease` or `./gradlew assembleDebug` to build the Android project. Afterwards, you can find the built APK at `android/app/build/outputs/apk/release/app-release.apk` or `android/app/build/outputs/apk/debug/app-debug.apk`.'
    )
  }
}
