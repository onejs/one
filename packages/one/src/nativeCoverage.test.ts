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
  Widgets: 'needs a widget extension target in the fixture app',
  LiveActivities: 'needs a widget extension target in the fixture app',
  'iOS.WidgetUI': 'needs a widget extension target in the fixture app',
  'iOS.ZoomTransitionAlignmentRectDetector': 'no fixture or suite',
  'iOS.ZoomTransitionEnabler': 'on zoom-detail, which the zoom e2e reaches only by tap',
  'Android.Color': 'no fixture or suite',
  'Android.Menu': 'no fixture or suite',
  'Android.ContextMenu': 'no fixture or suite',
  'UI.sampleCurve': 'effects helper; no suite asserts it',
  'UI.serializeCurve': 'effects helper; no suite asserts it',
  'UI.Icon':
    'Android suite missing; iOS workspace sizing, image accessibility, SF Symbol ink and role/explicit colors proven',
  'UI.Image': 'Android suite missing',
  'UI.PictureInPicture': 'fixture exists; simulators report no PiP, needs a device run',
  'UI.EdgeFade': 'effects fixture has a capture proof script, not a suite',
  'UI.Blur': 'effects fixture has a capture proof script, not a suite',
  'UI.Mask': 'effects fixture has a capture proof script, not a suite',
  'UI.TextInput': 'Android suite missing',
  'UI.ReservedRegions': 'fixture exists, no suite opens it',
  openURL:
    'Android suite missing; iOS workspace Safari destination and app return proven',
  LaunchScreen: 'Android suite missing',
  openShare: 'Android suite missing; iOS workspace Copy and cancellation proven',
  openSettings:
    'Android suite missing; iOS workspace Settings root and app return proven, app-specific page unproven',
  Network: 'iOS suite only',
  DocumentPicker: 'Android fixture exists, no suite opens it',
  useNetworkState:
    'Android suite missing; iOS workspace live state, refresh and two remounts proven',
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
// A suite may exercise an export while a presentation-specific variant still
// lacks runtime proof. Keep those limits visible in the generated table.
const partialGaps: Record<string, string> = {
  Clipboard:
    'Android setString and getString proven only through the share suite Copy check; no Android clipboard suite',
  BackgroundTasks:
    'iOS 27 simulator scheduler unavailability, pending query/cancel, and injected handler/completion/expiration proven; OS scheduling and cold launch need a physical device',
  DeviceAttestation:
    'iOS 27 simulator availability, input, and unavailable errors proven; successful App Attest and DeviceCheck operations need a registered physical device',
  Motion:
    'iOS 27 simulator has no motion sensors; availability and unavailable errors proven, live readings need a device run',
  'iOS.Menu':
    'primaryAction short tap, long-press menu, item callback, disabled behavior, plain Menu tap, and Picker selection with native checkmarks in Menu and ContextMenu proven on iOS 27; context previews unbound',
  'iOS.ArrangementView':
    'closed iPhone Duo automatic/split/overlay proven; open and folded postures unobserved',
  'iOS.EditButton':
    'Edit/Done label cycle proven; List edit state unobserved and row actions unavailable',
  'iOS.LinearGradient':
    'sRGB hex colors and normalized points proven on iOS 27; arbitrary SwiftUI Color values and explicit stops unbound',
  'iOS.RadialGradient':
    'opaque and alpha sRGB hex colors, empty/one/two/three colors, normalized center, and point radii proven on iOS 27; arbitrary SwiftUI Color values and explicit stops unbound',
  'iOS.AngularGradient':
    'sRGB hex colors, normalized center, and full-circle angle on iOS 27; partial-arc initializer, explicit stops, arbitrary SwiftUI Color values, and other iOS versions unproven',
  'iOS.EllipticalGradient':
    'sRGB hex colors, normalized center, and both radius fractions on iOS 27; explicit stops, arbitrary SwiftUI Color values, and other iOS versions unproven',
  'iOS.MeshGradient':
    '2×2 and 3×3 point/color grids, background, smoothing, and device/perceptual color spaces on iOS 27; Bezier-point and resolved-color initializers and other iOS versions unproven',
  'iOS.List':
    'Text row modifiers proven in plain List; section spacing, margins, and header prominence proven in insetGrouped List; refreshable callback and rearm proven in plain List with a NavigationStack-hosted search field on iPhone; indicator duration and other modifiers/styles unproven',
  'iOS.Picker':
    'palette outside Menu renders segmented on iOS 27 iPhone with native tap and external selection; earlier iOS, palette inside Menu, and navigationLink context unproven',
  'iOS.ScrollView':
    'vertical refreshable callback and rearm proven with a NavigationStack-hosted search field on iPhone; indicator duration, standalone search hosting, horizontal/both axes, and other modifiers unproven',
  'iOS.Section':
    'spacing, margins, and header prominence proven in insetGrouped List on iPhone; other section modifiers and Form behavior unproven',
  'iOS.ViewSlot':
    'background, mask, list row background, top/bottom and leading/trailing safe-area bars, bottom vertical inset, and leading/trailing horizontal insets in bounded hosts proven; scroll content and other named slots unproven',
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
  for (const [, imports] of source.matchAll(
    /import\s*\{([^}]+)\}\s*from\s*['"]one['"]/g
  )) {
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
  for (const name of new Set([
    ...Object.keys(PlatformApi),
    ...Object.keys(SafeAreaApi),
  ])) {
    if (
      (name.startsWith('use') ||
        name === 'getSizeClass' ||
        name === 'getHinge' ||
        name === 'onHingeChange') &&
      Object.hasOwn(PublicApi, name)
    ) {
      names.push({ name, label: name, platforms: ['ios', 'android'] })
    }
  }
  return names
}

test('every One namespace member has a conformance fixture reference or a documented gap', async () => {
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

  // standalone contracts retain the report and independently verified output.
  for (const platform of ['android', 'ios'] as const) {
    const directory = `evidence/uniform-native-modules/${platform}`
    const runtime = JSON.parse(read(`${directory}/runtime.json`))
    const pixels = JSON.parse(read(`${directory}/pixels.json`))
    expect(runtime.passed, `${platform} native module contract`).toBe(true)
    expect(pixels.passed, `${platform} independently decoded pixels`).toBe(true)
    expect(pixels.counterclockwiseNegativeControlRejected).toBe(true)
    const core = exportsUsed(read('fixtures/one-native-modules.tsx'))
    if (platform === 'android') {
      expect(runtime.unavailable.passed, 'Android no-native service contract').toBe(true)
      expect(runtime.unavailable.checks.length).toBeGreaterThan(60)
      for (const name of exportsUsed(read('fixtures/one-unavailable-services.ts'))) {
        proof.android.set(name, [
          ...(proof.android.get(name) ?? []),
          'native-modules:unavailable',
        ])
      }
    }
    for (const name of core) {
      proof[platform].set(name, [...(proof[platform].get(name) ?? []), 'native-modules'])
    }
  }

  // this external suite selects three APIs, not every service in its fixture.
  const external = 'evidence/realapps/share-cancel-controls'
  const receipt = JSON.parse(read(`${external}/restored-positive/receipt.json`))
  const results = JSON.parse(read(`${external}/restored-positive/api-results.json`))
  const run = JSON.parse(read(`${external}/restored-positive/run-result.json`))
  expect(receipt.platform).toBe('ios')
  expect(receipt.mode).toBe('external')
  expect(receipt.apis).toEqual(['One.openShare', 'One.openURL', 'One.openSettings'])
  expect(run.exitCode).toBe(0)
  const services = exportsUsed(read('fixtures/realapps-api-services.native.tsx'))
  for (const api of receipt.apis) {
    const name = api.replace(/^One\./, '')
    expect(services.has(name), `${api} external fixture`).toBe(true)
    expect(results[api].status, `${api} external result`).toBe('observed')
    proof.ios.set(name, [...(proof.ios.get(name) ?? []), 'realapps:external'])
  }
  const copy = JSON.parse(read(`${external}/copy/api-results.json`))
  expect(copy['One.openShare.nativeActivity'].value.action).toBe('sharedAction')
  expect(results['One.openShare.nativeActivity'].value.action).toBe('dismissedAction')
  for (const api of ['One.openURL', 'One.openSettings']) {
    const states = results[`${api}.appStates`].value.states
    expect(states.indexOf('background')).toBeGreaterThanOrEqual(0)
    expect(states.slice(states.indexOf('background') + 1)).toContain('active')
  }
  for (const control of ['negative-url', 'negative-settings']) {
    expect(JSON.parse(read(`${external}/${control}/run-result.json`)).exitCode).toBe(1)
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
    rows.push(
      `| \`${label}\` | ${ios} | ${android} | ${knownGaps[name] ?? partialGaps[name] ?? ''} |`
    )
  }

  await expect(
    [
      '# One native coverage',
      '',
      'Generated by `packages/one/src/nativeCoverage.test.ts` (`vitest -u` rewrites it).',
      'A cell names the conformance suites whose fixture uses the export.',
      'Suite names record fixture references, not successful runs or complete behavior coverage.',
      '`native-modules:unavailable` records historical rejection checks, not proof of a supported implementation.',
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
