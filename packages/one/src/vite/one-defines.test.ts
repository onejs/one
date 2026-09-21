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
  test('injects ONE_APP_* from the manifest', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      version: '9.9.9',
      ios: { bundleId: 'dev.probe.ios', buildNumber: '4242' },
      android: { applicationId: 'dev.probe.android', versionCode: 4243 },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBe('"9.9.9"')
    expect(define['import.meta.env.ONE_APP_VERSION']).toBe('"9.9.9"')
    // build prefers the ios build number; application id prefers android's
    expect(define['process.env.ONE_APP_BUILD']).toBe('"4242"')
    expect(define['import.meta.env.ONE_APP_BUILD']).toBe('"4242"')
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBe('"dev.probe.android"')
    expect(define['import.meta.env.ONE_APP_APPLICATION_ID']).toBe('"dev.probe.android"')
  })

  test('falls back across platforms when one side is missing', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      android: { applicationId: 'dev.probe.android', versionCode: 4243 },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBeUndefined()
    expect(define['process.env.ONE_APP_BUILD']).toBe('"4243"')
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBe('"dev.probe.android"')
  })

  test('defines nothing without version fields', async () => {
    const define = await defineFor({
      name: 'ProbeApp',
      ios: { bundleId: 'dev.probe.ios' },
      android: { applicationId: 'dev.probe.android' },
    })
    expect(define['process.env.ONE_APP_VERSION']).toBeUndefined()
    expect(define['process.env.ONE_APP_BUILD']).toBeUndefined()
    // application ids are always present when the platforms are configured
    expect(define['process.env.ONE_APP_APPLICATION_ID']).toBe('"dev.probe.android"')
  })
})
