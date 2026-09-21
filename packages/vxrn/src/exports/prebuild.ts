import { resolvePath } from '@vxrn/resolve'
import { detectPackageManager, type PackageManagerName } from '@vxrn/utils'
import FSExtra from 'fs-extra'
import path from 'node:path'
import colors from 'picocolors'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches } from '../utils/patches'
import {
  applyAndroidDependencyPatches,
  generateForPlatform,
  getNativeDependencyInventory,
  installNativeDependencies,
  validatePrebuildApp,
  type PrebuildAppConfig,
} from './prebuildWithoutExpo'

// single non-expo prebuild: the installed react native community template is
// the only generator. installed packages' community configuration is the only
// dependency discovery protocol; no config-plugin execution api exists.
export const prebuild = async ({
  root,
  platform,
  'no-install': noInstall = false,
  app,
}: {
  root: string
  platform?: 'ios' | 'android' | string
  'no-install'?: boolean
  app: PrebuildAppConfig
}) => {
  validatePrebuildApp(app, platform)

  const options = await fillOptions({ root })

  await applyBuiltInPatches(options)

  try {
    const packageJsonPath = path.join(root, 'package.json')
    const packageJsonContents = await FSExtra.readFile(packageJsonPath, 'utf8')
    const { devDependencies } = JSON.parse(packageJsonContents)
    if (!devDependencies?.['@react-native-community/template']) {
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

  if (platform == 'ios' || !platform) {
    await generateForPlatform(root, 'ios', app)
  }
  if (platform == 'android' || !platform) {
    await generateForPlatform(root, 'android', app)
  }

  // community config reads the generated projects, so discover after generation
  // and before installation. `--no-install` never fakes the linked package set.
  const inventory = await getNativeDependencyInventory(root)
  console.info(
    `[vxrn] native dependencies discovered through community autolinking: ${inventory.map((entry) => entry.name).join(', ') || '(none)'}`
  )

  if (platform == 'android' || !platform) {
    applyAndroidDependencyPatches({ root, app, inventory })
  }

  if (!noInstall) {
    installNativeDependencies({ root, platform })
  } else if (!platform || platform === 'ios') {
    console.info(`Run cd ios && pod install`)
    console.info(
      'Then run `open *.xcworkspace` in your terminal to open the prebuilt iOS project, then you can either run it via Xcode or archive it for distribution.'
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
  if (!platform || platform === 'android') {
    console.info(
      `
Android:

  \`cd android\` and run \`./gradlew generateCodegenArtifactsFromSchema\`, then \`./gradlew assembleRelease\` or \`./gradlew assembleDebug\` to build the Android project.

  Afterwards, you can find the built APK at \`android/app/build/outputs/apk/release/app-release.apk\` or
  \`android/app/build/outputs/apk/debug/app-debug.apk\`.

`
    )
  }

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
  return (
    error.code === 'MODULE_NOT_FOUND' &&
    /@react-native-community\/cli/.test(error.message)
  )
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

export async function replaceInUTF8File(
  filePath: string,
  findThis: string,
  replaceWith: string
) {
  const fileContent = await FSExtra.readFile(filePath, 'utf8')
  const replacedFileContent = fileContent.replace(findThis, replaceWith)
  if (replacedFileContent !== fileContent) {
    await FSExtra.writeFile(filePath, replacedFileContent, 'utf8')
  }
}
