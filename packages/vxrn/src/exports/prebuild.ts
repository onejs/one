import { detectPackageManager, type PackageManagerName } from '@vxrn/utils'
import { existsSync, lstatSync, readdirSync, readFileSync, renameSync, rmSync } from 'node:fs'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fillOptions } from '../config/getOptionsFilled'
import { applyBuiltInPatches, type UserDepPatches } from '../utils/patches'
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
  beforeInstall,
  patches,
}: {
  root: string
  platform?: 'ios' | 'android' | string
  'no-install'?: boolean
  app: PrebuildAppConfig
  // runs once the native projects exist and before discovery and install, so
  // a caller can add local pods the podfile picks up
  beforeInstall?: () => Promise<void>
  patches?: UserDepPatches
}) => {
  validatePrebuildApp(app, platform)

  const options = await fillOptions({ root })

  await applyBuiltInPatches({ root: options.root, patches })

  try {
    const packageJsonPath = path.join(root, 'package.json')
    const packageJsonContents = await readFile(packageJsonPath, 'utf8')
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

  const ios = path.join(root, 'ios')
  const previousIos = `${ios}.previous`
  rmSync(previousIos, { recursive: true, force: true })
  const reusesIos = (platform == 'ios' || !platform) && existsSync(ios)
  if (reusesIos) renameSync(ios, previousIos)

  if (platform == 'ios' || !platform) {
    await generateForPlatform(root, 'ios', app)
  }
  if (platform == 'android' || !platform) {
    await generateForPlatform(root, 'android', app)
  }

  await beforeInstall?.()

  if (reusesIos) reuseUnchangedIosProject(previousIos, ios)

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
}

// xcode keys each build input on its file identity and modification time, so a
// regenerated file it already compiled must be the same file, not equal bytes.
// what pod install and xcodebuild wrote stays too, so both resume incrementally.
function reuseUnchangedIosProject(previous: string, next: string) {
  for (const entry of readdirSync(next, { recursive: true, withFileTypes: true })) {
    if (!entry.isFile()) continue
    const file = path.join(entry.parentPath, entry.name)
    const old = path.join(previous, path.relative(next, file))
    if (!existsSync(old) || !lstatSync(old).isFile()) continue
    if (lstatSync(old).size !== lstatSync(file).size) continue
    if (!readFileSync(old).equals(readFileSync(file))) continue
    renameSync(old, file)
  }
  for (const name of ['Pods', 'Podfile.lock', 'build']) {
    const from = path.join(previous, name)
    const to = path.join(next, name)
    if (existsSync(from) && !existsSync(to)) renameSync(from, to)
  }
  rmSync(previous, { recursive: true, force: true })
}

export async function replaceInUTF8File(
  filePath: string,
  findThis: string,
  replaceWith: string
) {
  const fileContent = await readFile(filePath, 'utf8')
  const replacedFileContent = fileContent.replace(findThis, replaceWith)
  if (replacedFileContent !== fileContent) {
    await writeFile(filePath, replacedFileContent, 'utf8')
  }
}
