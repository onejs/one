import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { isAbsolute, join } from 'node:path'
import { rolldown } from 'rolldown'
import { expect, it } from 'vitest'
import {
  assertLinkSet,
  IOS_LINK_SET_REPORT_ENV,
  oneDirectory,
  readCatalog,
} from '../src/cli/iosLinkSet'
import { iosLinkSetPlugin } from '../src/vite/plugins/iosLinkSetPlugin'
import { iosSdkPlugin } from '../src/vite/plugins/iosSdkPlugin'
import { generation } from '../ios-bindings/manifest.json'

async function bundleReport(
  files: Record<string, string>,
  options: { resolveRealOne?: boolean } = {}
): Promise<{ groups: string[]; frameworks: string[] }> {
  const root = mkdtempSync(join(tmpdir(), 'one-link-set-'))
  const previous = process.env[IOS_LINK_SET_REPORT_ENV]
  const report = join(root, 'report.json')
  process.env[IOS_LINK_SET_REPORT_ENV] = report
  const oneDir = oneDirectory()
  try {
    for (const [name, content] of Object.entries(files)) {
      writeFileSync(join(root, name), content)
    }
    const bundle = await rolldown({
      input: join(root, 'app.js'),
      resolve: options.resolveRealOne
        ? { extensions: ['.ios.js', '.native.js', '.js', '.mjs'] }
        : undefined,
      external: options.resolveRealOne
        ? (id) =>
            !id.startsWith('.') &&
            !isAbsolute(id) &&
            id !== 'one' &&
            !id.startsWith('one/')
        : (id) => id === 'one' || id.startsWith(oneDir + '/'),
      plugins: [
        ...(options.resolveRealOne
          ? [
              {
                name: 'resolve-one',
                resolveId(source: string) {
                  if (source === 'one') return join(oneDir, 'dist/esm/index.native.js')
                  if (source === 'one/ios-runtime')
                    return join(oneDir, 'dist/esm/ios-runtime.native.js')
                },
              },
              iosSdkPlugin('ios', oneDir),
            ]
          : []),
        iosLinkSetPlugin().api.vxrnNative({ platform: 'ios', dev: false }),
      ],
    })
    try {
      await bundle.generate({ format: 'iife', minify: true, globals: { one: 'one' } })
    } finally {
      await bundle.close()
    }
    return JSON.parse(readFileSync(report, 'utf8'))
  } finally {
    if (previous === undefined) delete process.env[IOS_LINK_SET_REPORT_ENV]
    else process.env[IOS_LINK_SET_REPORT_ENV] = previous
    rmSync(root, { recursive: true, force: true })
  }
}

it('selects SDK frameworks from the emitted production graph after unused imports disappear', async () => {
  const report = await bundleReport({
    'app.js': `import { useAudioPlayer, CameraView, Location, One } from 'one'; globalThis.features = [useAudioPlayer, CameraView, Location, One.iOS.MediaViewer]; import { used } from './used.js'; import { unused } from './unused.js'; globalThis.result = used();`,
    'used.js': `export function used() { return 'UIKit_${generation}'; }`,
    'unused.js': `export function unused() { return 'EventKit_${generation}'; }`,
  })
  expect(report).toEqual({
    groups: ['preview3d', 'maps', 'media', 'camera'],
    frameworks: ['UIKit'],
  })
})

it('separates camera from media and photo library usage and includes Contacts in contacts group', async () => {
  expect(readCatalog().groups.contacts.frameworks).toEqual(['Contacts', 'ContactsUI'])
  expect(
    await bundleReport({
      'app.js': `import { useAudioPlayer, One } from 'one'; globalThis.features = [useAudioPlayer, One.Audio];`,
    })
  ).toEqual({ groups: ['media'], frameworks: [] })
  expect(
    await bundleReport({
      'app.js': `import { One } from 'one'; globalThis.features = One.ImagePicker.launchLibrary();`,
    })
  ).toEqual({ groups: ['photos'], frameworks: [] })
  for (const snippet of [
    `import { One } from 'one'; globalThis.features = One.ImagePicker.launchCamera();`,
    `import { One } from 'one'; globalThis.features = One.ImagePicker.getCameraPermissions();`,
    `import { One } from 'one'; globalThis.features = One.ImagePicker.requestCameraPermissions();`,
    `import { One } from 'one'; globalThis.features = One.ImagePicker;`,
  ]) {
    expect(await bundleReport({ 'app.js': snippet })).toEqual({
      groups: ['photos', 'camera'],
      frameworks: [],
    })
  }
  expect(
    await bundleReport({
      'app.js': `import { One } from 'one'; globalThis.features = [One.Contacts, One.iOS.CNContactStore];`,
    })
  ).toEqual({ groups: ['contacts'], frameworks: [] })
})

it('drops EventKit when destructuring non-calendar One members and links it for One.Calendar', async () => {
  const withoutCalendar = await bundleReport(
    {
      'app.js': `import { One } from 'one'; const { Notifications, Updates, Storage, openSettings, Android: { DatePickerDialog, TimePickerDialog }, iOS: { DatePicker } } = One; globalThis.features = [Notifications, Updates, Storage, openSettings, DatePickerDialog, TimePickerDialog, DatePicker];`,
    },
    { resolveRealOne: true }
  )
  expect(withoutCalendar.frameworks).not.toContain('EventKit')
  expect(withoutCalendar).toEqual({ groups: [], frameworks: [] })

  const withCalendar = await bundleReport(
    {
      'app.js': `import { One } from 'one'; globalThis.features = One.Calendar;`,
    },
    { resolveRealOne: true }
  )
  expect(withCalendar.frameworks).toContain('EventKit')
}, 30_000)

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
