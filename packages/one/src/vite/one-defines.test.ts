import { fileURLToPath } from 'node:url'
import { describe, expect, test } from 'vitest'
import type { NativeAppManifest } from '../native/appManifest'
import { one } from './one'

// one() resolves the route tree from the process root, so run it from a
// fixture app. each test file gets its own worker, and cwd is restored.
async function defineFor(app: NativeAppManifest) {
  const cwd = process.cwd()
  process.chdir(fileURLToPath(new URL('../../../../tests/native-features', import.meta.url)))
  try {
    const plugins = (await one({ native: { app } })) as Array<any>
    const definePlugin = plugins
      .flat(Infinity)
      .find((plugin) => plugin?.name === 'one-define-environment')
    expect(definePlugin).toBeDefined()
    return (await definePlugin.config()).define as Record<string, string>
  } finally {
    process.chdir(cwd)
  }
}

describe('one-define-environment app info', () => {
  test('injects ONE_APP_VERSION from the manifest', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      version: '9.9.9',
      ios: { bundleId: 'dev.probe.ios', buildNumber: '4242' },
      android: { applicationId: 'dev.probe.android', versionCode: 4243 },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBe('"9.9.9"')
    expect(define['import.meta.env.ONE_APP_VERSION']).toBe('"9.9.9"')
    // build and application id have no honest web value: never injected,
    // so the web entry reads null instead of a cross-platform guess.
    expect(define['process.env.ONE_APP_BUILD']).toBeUndefined()
    expect(define['import.meta.env.ONE_APP_BUILD']).toBeUndefined()
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBeUndefined()
    expect(define['import.meta.env.ONE_APP_APPLICATION_ID']).toBeUndefined()
  })

  test('defines nothing without a version', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      ios: { bundleId: 'dev.probe.ios', buildNumber: '4242' },
      android: { applicationId: 'dev.probe.android', versionCode: 4243 },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBeUndefined()
    expect(define['import.meta.env.ONE_APP_VERSION']).toBeUndefined()
    expect(define['process.env.ONE_APP_BUILD']).toBeUndefined()
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBeUndefined()
  })
})
