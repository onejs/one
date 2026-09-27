// every public One export needs runtime evidence on each platform it runs on: a
// native-features conformance suite that navigates to a fixture using it. the
// generated table in tests/native-features/COVERAGE.md is the coverage matrix;
// knownGaps only shrinks, so a new export lands with its suite.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'
import * as PublicApi from './index'
import { One } from './one'
import * as PlatformApi from './platform'
import * as SafeAreaApi from './safe-area-context'

const fixtureRoot = join(import.meta.dirname, '../../../tests/native-features')

// exports with no suite yet on a platform they run on. remove an entry when its
// suite lands; the test fails while a covered export is still listed
const knownGaps: Record<string, string> = {
  Database: 'Android suite missing',
  'iOS.ArrangementView': 'fixture exists, no suite opens it',
  'iOS.TabViewSlot': 'no fixture or suite',
  'iOS.ZStack': 'no fixture or suite',
  'iOS.Glass': 'no fixture or suite',
  'iOS.LabeledContent': 'no fixture or suite',
  'iOS.Spacer': 'no fixture or suite',
  'iOS.ViewSlot': 'only the autogen fixture, which no suite opens',
  'iOS.ShareLink': 'fixture exists, no suite opens it',
  'iOS.ContentUnavailableView': 'fixture exists, no suite opens it',
  'iOS.PhotosPicker': 'fixture exists, no suite opens it',
  'iOS.WebView': 'fixture exists, no suite opens it',
  'iOS.EditButton': 'no fixture or suite',
  'iOS.EmptyView': 'no fixture or suite',
  'iOS.Widgets': 'needs a widget extension target in the fixture app',
  'iOS.LiveActivities': 'needs a widget extension target in the fixture app',
  'iOS.WidgetUI': 'needs a widget extension target in the fixture app',
  'iOS.ZoomTransitionAlignmentRectDetector': 'no fixture or suite',
  'iOS.ZoomTransitionEnabler': 'on zoom-detail, which the zoom e2e reaches only by tap',
  'Android.Color': 'no fixture or suite',
  'Android.Menu': 'no fixture or suite',
  'Android.ContextMenu': 'no fixture or suite',
  'UI.sampleCurve': 'effects helper; no suite asserts it',
  'UI.serializeCurve': 'effects helper; no suite asserts it',
  'UI.Icon': 'no fixture or suite',
  'UI.Image': 'fixture exists, no suite opens it',
  'UI.PictureInPicture': 'fixture exists; simulators report no PiP, needs a device run',
  'UI.EdgeFade': 'effects fixture has a capture proof script, not a suite',
  'UI.Blur': 'effects fixture has a capture proof script, not a suite',
  'UI.Mask': 'effects fixture has a capture proof script, not a suite',
  'UI.TextInput': 'no fixture or suite',
  'UI.ReservedRegions': 'fixture exists, no suite opens it',
  openURL: 'react native Linking underneath; proven in the Contrast app, no suite yet',
  openShare: 'react native Share underneath; proven in the Contrast app, no suite yet',
  openSettings: 'react native Linking underneath; no suite yet',
  Clipboard: 'iOS suite only',
  Network: 'iOS suite only',
  DocumentPicker: 'Android fixture exists, no suite opens it',
  useNetworkState: 'no fixture or suite',
  useNativeState: 'iOS suite only',
  useSizeClass: 'fixture exists, no suite opens it',
  getSizeClass: 'no fixture or suite',
  useHinge: 'fixture exists, no suite opens it',
  getHinge: 'no fixture or suite',
  onHingeChange: 'no fixture or suite',
  useReservedRegions: 'fixture exists, no suite opens it',
  useReservedRegionsReady: 'no fixture or suite',
  useWindowSegments: 'fixture exists, no suite opens it',
  useSpanning: 'fixture exists, no suite opens it',
}

type Platform = 'ios' | 'android'

const read = (path: string) => readFileSync(join(fixtureRoot, path), 'utf8')

// a suite's proof surface is the route it opens, a file or a directory, plus
// every fixture it reaches through relative imports
function routeSource(route: string): string {
  const entry = join(fixtureRoot, 'app', route)
  const files = existsSync(`${entry}.tsx`)
    ? [`${entry}.tsx`]
    : readdirSync(entry, { recursive: true, encoding: 'utf8' })
        .filter((path) => path.endsWith('.tsx'))
        .map((path) => join(entry, path))
  const seen = new Set<string>()
  const sources: string[] = []
  const visit = (file: string) => {
    if (seen.has(file)) return
    seen.add(file)
    const source = readFileSync(file, 'utf8')
    sources.push(source)
    for (const [, specifier] of source.matchAll(/from '(\.\.?\/[^']+)'/g)) {
      const base = join(dirname(file), specifier)
      for (const ext of ['.tsx', '.native.tsx', '.ts', '/index.tsx']) {
        if (existsSync(`${base}${ext}`)) visit(`${base}${ext}`)
      }
    }
  }
  files.forEach(visit)
  return sources.join('\n')
}

function iosSuites() {
  const script = read('scripts/one-native-conformance.ts')
  const home = script.match(/const suiteHome: Record<Suite, string> = \{([\s\S]*?)\n\}/)
  if (!home) throw new Error('suiteHome not found in the iOS conformance script')
  const suites = [...home[1].matchAll(/'?([a-z-]+)'?: 'nav-([a-z-]+)'/g)].map(
    ([, suite, route]) => ({ suite, route })
  )
  // the apple-file flow also opens the imperative document picker route.
  suites.push({ suite: 'apple-file', route: 'one-native-document-picker' })
  // the appium e2e tests open routes directly
  const e2e = read('tests/native-features.test.ios.ts')
  for (const [, route] of e2e.matchAll(/navigateTo\(driver, '\/([a-z0-9/-]+)'\)/g)) {
    suites.push({ suite: `e2e:${route}`, route })
  }
  return suites
}

function androidSuites() {
  const script = read('scripts/one-native-conformance.android.ts')
  const navIds = new Set(['nav-one-native-android'])
  for (const [, navId] of script.matchAll(/tapNavigation\(config, '(nav-[a-z-]+)'\)/g)) {
    navIds.add(navId)
  }
  return [...navIds].map((navId) => ({
    suite: navId.replace(/^nav-one-native-?/, '') || 'android',
    route: navId.replace(/^nav-/, ''),
  }))
}

function exportsUsed(source: string) {
  const used = new Set<string>()
  for (const [, ns, name] of source.matchAll(/One\.(iOS|Android|UI)\.([A-Za-z]+)/g)) {
    used.add(`${ns}.${name}`)
  }
  for (const [, name] of source.matchAll(/One\.([A-Za-z]+)/g)) {
    if (name !== 'iOS' && name !== 'Android' && name !== 'UI') used.add(name)
  }
  for (const [, imports] of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]one['"]/g)) {
    for (const specifier of imports.split(',')) {
      const [imported, local] = specifier.trim().split(/\s+as\s+/)
      if (new RegExp(`\\b${local ?? imported}\\s*\\(`).test(source)) used.add(imported)
    }
  }
  return used
}

function publicExports() {
  const names: { name: string; label: string; platforms: Platform[] }[] = []
  for (const key of Object.keys(One)) {
    if (key === 'platform') continue
    const value = Reflect.get(One, key)
    if (key === 'iOS' || key === 'Android' || key === 'UI') {
      const platforms: Platform[] =
        key === 'iOS' ? ['ios'] : key === 'Android' ? ['android'] : ['ios', 'android']
      for (const name of Object.keys(value))
        names.push({ name: `${key}.${name}`, label: `One.${key}.${name}`, platforms })
    } else {
      names.push({ name: key, label: `One.${key}`, platforms: ['ios', 'android'] })
    }
  }
  for (const name of new Set([...Object.keys(PlatformApi), ...Object.keys(SafeAreaApi)])) {
    if (
      (name.startsWith('use') || name === 'getSizeClass' || name === 'getHinge' || name === 'onHingeChange') &&
      Object.hasOwn(PublicApi, name)
    ) {
      names.push({ name, label: name, platforms: ['ios', 'android'] })
    }
  }
  return names
}

test('every One namespace member is exercised by a native conformance suite', async () => {
  const proof: Record<Platform, Map<string, string[]>> = {
    ios: new Map(),
    android: new Map(),
  }
  for (const [platform, suites] of [
    ['ios', iosSuites()],
    ['android', androidSuites()],
  ] as const) {
    for (const { suite, route } of suites) {
      for (const name of exportsUsed(routeSource(route))) {
        proof[platform].set(name, [...(proof[platform].get(name) ?? []), suite])
      }
    }
  }

  const rows: string[] = []
  const uncovered: string[] = []
  for (const { name, label, platforms } of publicExports()) {
    const cell = (platform: Platform) =>
      platforms.includes(platform)
        ? [...new Set(proof[platform].get(name) ?? [])].join(', ') || 'missing'
        : 'n/a'
    const ios = cell('ios')
    const android = cell('android')
    if (ios === 'missing' || android === 'missing') uncovered.push(name)
    rows.push(`| \`${label}\` | ${ios} | ${android} | ${knownGaps[name] ?? ''} |`)
  }

  await expect(
    [
      '# One native coverage',
      '',
      'Generated by `packages/one/src/nativeCoverage.test.ts` (`vitest -u` rewrites it).',
      'A cell names the conformance suites whose fixture uses the export.',
      '',
      '| export | iOS suites | Android suites | gap |',
      '| --- | --- | --- | --- |',
      ...rows,
      '',
    ].join('\n')
  ).toMatchFileSnapshot(join(fixtureRoot, 'COVERAGE.md'))

  expect(uncovered.filter((name) => !knownGaps[name])).toEqual([])
  expect(Object.keys(knownGaps).filter((name) => !uncovered.includes(name))).toEqual([])
})
