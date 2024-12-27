import module from 'node:module'
import path from 'node:path'
import FSExtra from 'fs-extra'
import { fillOptions } from '../utils/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'
/*
This code block is partially copied from meta owned repos.
Copyright (c) Facebook, Inc. and its affiliates.
*/
const generateForPlatform = async (root: string, platform: 'ios' | 'android', appConfig: any) => {
  const dest = path.resolve(platform)
  const appName = appConfig.name
  const displayName = appConfig.displayName
  const require = module.createRequire(root)
  const importPath = require.resolve('@react-native-community/cli/build/tools/walk.js', {
    paths: [root],
  })
  const src = path.join(
    path.dirname(
      require.resolve('@react-native-community/template/template/package.json', {
        paths: [root],
      })
    ),
    platform
  )
  const walk = (await import(importPath)).default.default
  walk(src).forEach((absoluteSrc: string) => {
    const relativeFilePath = transformPath(path.relative(src, absoluteSrc))
      .replace(/HelloWorld/g, appName)
      .replace(/helloworld/g, appName.toLowerCase())
    const srcPath = absoluteSrc
    const destPath = path.resolve(dest, relativeFilePath)
    console.log('copying', '"' + srcPath + '"', 'to', '"' + destPath + '"')

    const replacements: Record<string, string> = {
      'Hello App Display Name': displayName || appName,
      HelloWorld: appName,
      helloworld: appName,
    }

    if (FSExtra.lstatSync(srcPath).isDirectory()) {
      if (!FSExtra.existsSync(destPath)) {
        FSExtra.mkdirSync(destPath)
      }
      return
    }

    const extension = path.extname(srcPath)

    if (['.png', '.jar', '.keystore'].includes(extension)) {
      FSExtra.copyFileSync(srcPath, destPath)
      return
    }
    const srcPermissions = FSExtra.statSync(srcPath).mode
    let content = FSExtra.readFileSync(srcPath, 'utf8')
    Object.entries(replacements).forEach(([regex, value]) => {
      content = content.replace(new RegExp(regex, 'g'), value)
    })
    FSExtra.writeFileSync(destPath, content, {
      encoding: 'utf8',
      mode: srcPermissions,
    })
  })
}
/*
End of meta owned code
End of copyright Facebook
*/

const transformPath = (filePath: string) => {
  return filePath
    .replace('_BUCK', 'BUCK')
    .replace('_gitignore', '.gitignore')
    .replace('_gitattributes', '.gitattributes')
    .replace('_babelrc', '.babelrc')
    .replace('_editorconfig', '.editorconfig')
    .replace('_eslintrc.js', '.eslintrc.js')
    .replace('_flowconfig', '.flowconfig')
    .replace('_buckconfig', '.buckconfig')
    .replace('_prettierrc.js', '.prettierrc.js')
    .replace('_bundle', '.bundle')
    .replace('_ruby-version', '.ruby-version')
    .replace('_node-version', '.node-version')
    .replace('_watchmanconfig', '.watchmanconfig')
    .replace('_xcode.env', '.xcode.env')
}

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

      console.warn('expo unfortunatly added some scripts in package.json')
      console.log('please replace "expo run:ios" with "one run:ios"')
      console.log('please replace "expo run:android" with "one run:android"')
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
  } else {
    try {
      const packageJsonPath = path.join(root, 'package.json')
      let packageJsonContents = await FSExtra.readFile(packageJsonPath, 'utf8')
      let { devDependencies } = JSON.parse(packageJsonContents)
      if (!devDependencies['@react-native-community/template']) {
        throw new Error(
          '"@react-native-community/template" is not found in package.json, please install "@react-native-community/template" as dev dependency'
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
  }
  if (!platform || platform === 'ios') {
    console.info(
      'Run `open ios/*.xcworkspace` in your terminal to open the prebuilt iOS project, then you can either run it via Xcode or archive it for distribution.'
    )
  }
  if (!platform || platform === 'android') {
    console.info(
      '`cd android` then `./gradlew assembleRelease` or `./gradlew assembleDebug` to build the Android project. Afterwards, you can find the built APK at `android/app/build/outputs/apk/release/app-release.apk` or `android/app/build/outputs/apk/debug/app-debug.apk`.'
    )
  }
}
