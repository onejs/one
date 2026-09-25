// every public One export needs runtime evidence on each platform it runs on: a
// native-features conformance suite that navigates to a fixture using it. the
// generated table in tests/native-features/COVERAGE.md is the coverage matrix;
// knownGaps only shrinks, so a new export lands with its suite.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'
import { One } from './one'

const fixtureRoot = join(import.meta.dirname, '../../../tests/native-features')

// exports with no suite yet on a platform they run on. remove an entry when its
// suite lands; the test fails while a covered export is still listed
const knownGaps: Record<string, string> = {
  Database: 'no fixture or suite',
  'iOS.ArrangementView': 'fixture exists, no suite opens it',
  'iOS.TabViewSlot': 'no fixture or suite',
  'iOS.ContextMenu': 'fixture exists, no suite opens it',
  'iOS.FullScreenCover': 'fixture exists, no suite opens it',
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
  'UI.useNativeState': 'iOS suite only',
  'UI.useSizeClass': 'fixture exists, no suite opens it',
  'UI.getSizeClass': 'no fixture or suite',
  'UI.useHinge': 'fixture exists, no suite opens it',
  'UI.getHinge': 'no fixture or suite',
  'UI.onHingeChange': 'no fixture or suite',
  'UI.ReservedRegions': 'fixture exists, no suite opens it',
  Clipboard: 'iOS suite only',
  Network: 'iOS suite only',
  DocumentPicker: 'fixture exists, no suite opens it',
  SecureStore: 'no fixture or suite',
  useNetworkState: 'no fixture or suite',
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
  return used
}

function publicExports() {
  const names: { name: string; platforms: Platform[] }[] = []
  for (const key of Object.keys(One)) {
    if (key === 'platform') continue
    const value = Reflect.get(One, key)
    if (key === 'iOS' || key === 'Android' || key === 'UI') {
      const platforms: Platform[] =
        key === 'iOS' ? ['ios'] : key === 'Android' ? ['android'] : ['ios', 'android']
      for (const name of Object.keys(value))
        names.push({ name: `${key}.${name}`, platforms })
    } else {
      names.push({ name: key, platforms: ['ios', 'android'] })
    }
  }
  return names
}

test('every One export is exercised by a native conformance suite', async () => {
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
  for (const { name, platforms } of publicExports()) {
    const cell = (platform: Platform) =>
      platforms.includes(platform)
        ? [...new Set(proof[platform].get(name) ?? [])].join(', ') || 'missing'
        : 'n/a'
    const ios = cell('ios')
    const android = cell('android')
    if (ios === 'missing' || android === 'missing') uncovered.push(name)
    rows.push(`| \`One.${name}\` | ${ios} | ${android} | ${knownGaps[name] ?? ''} |`)
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
