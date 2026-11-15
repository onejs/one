import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { rolldown } from 'rolldown'
import { expect, it } from 'vitest'
import { assertLinkSet, IOS_LINK_SET_REPORT_ENV } from '../src/cli/iosLinkSet'
import { iosLinkSetPlugin } from '../src/vite/plugins/iosLinkSetPlugin'
import { generation } from '../ios-bindings/manifest.json'

it('selects SDK frameworks from the emitted production graph after unused imports disappear', async () => {
  const root = mkdtempSync(join(tmpdir(), 'one-link-set-'))
  const previous = process.env[IOS_LINK_SET_REPORT_ENV]
  const report = join(root, 'report.json')
  process.env[IOS_LINK_SET_REPORT_ENV] = report
  try {
    const input = join(root, 'app.js')
    writeFileSync(
      input,
      `import { useAudioPlayer, CameraView, Location } from 'one'; globalThis.features = [useAudioPlayer, CameraView, Location]; import { used } from './used.js'; import { unused } from './unused.js'; globalThis.result = used();`
    )
    writeFileSync(
      join(root, 'used.js'),
      `export function used() { return 'UIKit_${generation}'; }`
    )
    writeFileSync(
      join(root, 'unused.js'),
      `export function unused() { return 'EventKit_${generation}'; }`
    )
    const bundle = await rolldown({
      input,
      external: ['one'],
      plugins: [iosLinkSetPlugin().api.vxrnNative({ platform: 'ios', dev: false })],
    })
    try {
      await bundle.generate({ format: 'iife', minify: true, globals: { one: 'one' } })
    } finally {
      await bundle.close()
    }
    expect(JSON.parse(readFileSync(report, 'utf8'))).toEqual({
      groups: ['maps', 'media'],
      frameworks: ['UIKit'],
    })
  } finally {
    if (previous === undefined) delete process.env[IOS_LINK_SET_REPORT_ENV]
    else process.env[IOS_LINK_SET_REPORT_ENV] = previous
    rmSync(root, { recursive: true, force: true })
  }
})

it('rejects SDK imports absent from the installed native build configuration', () => {
  const root = mkdtempSync(join(tmpdir(), 'one-sdk-link-set-'))
  try {
    const config = join(root, 'Target Support Files', 'OneSDKBindings')
    mkdirSync(config, { recursive: true })
    writeFileSync(
      join(config, 'OneSDKBindings.release.xcconfig'),
      'ONE_IOS_SDK_FRAMEWORKS = Foundation UIKit\n'
    )
    const env = { PODS_ROOT: root, CONFIGURATION: 'Release' }
    expect(() => assertLinkSet([], env, ['UIKit'])).not.toThrow()
    expect(() => assertLinkSet([], env, ['EventKit'])).toThrow(
      'lacks iOS SDK bindings for EventKit'
    )
    expect(() =>
      assertLinkSet([], { ...env, CONFIGURATION: 'Debug' }, ['EventKit'])
    ).not.toThrow()
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
