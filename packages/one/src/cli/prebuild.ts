import { validateNativeApp } from '../native/appManifest'
import { loadUserOneOptions } from '../vite/loadConfig'

export async function run(args: {
  platform?: string
  'no-install'?: boolean
}) {
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
