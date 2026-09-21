import { createRequire } from 'node:module'
import { join } from 'node:path'
import { validateNativeApp } from '../native/appManifest'
import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: { platform?: string; 'no-install'?: boolean }) {
  const root = process.cwd()
  const projectRequire = createRequire(join(root, 'package.json'))
  let hasExpoModulesCore = false
  try {
    projectRequire.resolve('expo-modules-core/package.json')
    hasExpoModulesCore = true
  } catch (error) {
    if (
      !error ||
      typeof error !== 'object' ||
      !('code' in error) ||
      error.code !== 'MODULE_NOT_FOUND'
    ) {
      throw error
    }
  }
  if (hasExpoModulesCore) {
    throw new Error(
      '[one] one prebuild only generates Expo-free projects. This app resolves expo-modules-core; run Expo prebuild and list "vxrn/expo-plugin" in the Expo config.'
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
  const { prebuild } = await import('vxrn')

  await prebuild({
    root: process.cwd(),
    ...args,
    app,
  })
}
