import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { validateNativeApp } from '../native/appManifest'
import { loadUserOneOptions } from '../vite/loadConfig'

// owned output: every `one prebuild` app Release-builds through this config.
// xcodebuild's bundle phase and gradle's react block both invoke
// `react-native bundle` via react-native/cli.js, which loads its `bundle`
// command override from here. without it the stock bundle command runs: it
// rejects the --config-cmd xcode passes and needs a metro.config.js One apps
// do not have. constant bytes, no per-app inputs.
const REACT_NATIVE_CONFIG = `module.exports = require('one/react-native-config')\n`

export async function run(args: { platform?: string; 'no-install'?: boolean }) {
  const root = process.cwd()
  const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'))
  const hasExpo =
    Object.hasOwn(packageJson.dependencies ?? {}, 'expo') ||
    Object.hasOwn(packageJson.devDependencies ?? {}, 'expo')
  if (hasExpo) {
    throw new Error(
      '[one] one prebuild only generates Expo-free projects. This app declares expo; run Expo prebuild and list "vxrn/expo-plugin" in the Expo config.'
    )
  }
  const { oneOptions } = await loadUserOneOptions('build', true)
  const native = oneOptions?.native
  const app = typeof native === 'object' ? native.app : undefined
  if (!app) {
    throw new Error(
      '[one] native.app is required: configure one({ native: { app } }) with name, ios.bundleId, and android.applicationId'
    )
  }
  validateNativeApp(app)
  writeFileSync(join(root, 'react-native.config.cjs'), REACT_NATIVE_CONFIG)
  const { prebuild } = await import('vxrn')

  await prebuild({
    root: process.cwd(),
    ...args,
    app,
  })
}
