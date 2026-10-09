// every public One export needs runtime evidence on each platform it runs on: a
// native-features conformance suite that navigates to a fixture using it. the
// generated table in tests/native-features/COVERAGE.md is the coverage matrix;
// knownGaps only shrinks, so a new export lands with its suite.
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { expect, test } from 'vitest'
import {
  iosExternalAcceptanceAPIs,
  modeAPIs,
} from '../../../tests/native-features/fixtures/realapps-api-coverage'
import * as PublicApi from '../src/index'
import { One } from '../src/one'
import * as PlatformApi from '../src/platform'
import * as SafeAreaApi from '../src/safe-area-context'

const fixtureRoot = join(import.meta.dirname, '../../../tests/native-features')

// exports with no suite yet on a platform they run on. remove an entry when its
// suite lands; the test fails while a covered export is still listed
const knownGaps: Record<string, string> = {
  'Android.Color': 'no fixture or suite',
  'Android.Menu': 'no fixture or suite',
  'Android.ContextMenu': 'no fixture or suite',
  'UI.sampleCurve':
    'Android suite missing; iOS preset, custom, bezier and clamped values proven',
  'UI.serializeCurve':
    'Android suite missing; iOS preset, custom and bezier serialization proven',
  'UI.Icon':
    'Android suite missing; iOS workspace sizing, image accessibility, SF Symbol ink and role/explicit colors proven',
  'UI.Image': 'Android suite missing',
  'UI.PictureInPicture': 'fixture exists; simulators report no PiP, needs a device run',
  'UI.EdgeFade':
    'Android suite missing; iOS bounded mask/overlay curve and current layered blur pixels proven; exact progressive and live scrolling unproven',
  'UI.Blur':
    'Android suite missing; iOS bounded backdrop blur and sharp foreground pixels proven; live tint/lifecycle unproven',
  'UI.Mask': 'Android suite missing; iOS bounded hidden/visible/half-alpha pixels proven',
  'UI.TextInput': 'Android suite missing',
  'UI.ReservedRegions':
    'Android suite missing; iOS flat workspace native readiness, bounds and empty regions proven; folding regions unproven',
  LaunchScreen: 'Android suite missing',
  Network: 'iOS suite only',
  DocumentPicker: 'Android fixture exists, no suite opens it',
  useNetworkState:
    'Android suite missing; iOS workspace live state, refresh and two remounts proven',
  useNativeState: 'iOS suite only',
  useSizeClass:
    'Android suite missing; iOS flat workspace getter/hook agreement proven; live trait changes unproven',
  getSizeClass:
    'Android suite missing; iOS flat workspace current and refreshed reads proven; live trait changes unproven',
  useHinge:
    'Android suite missing; iOS flat workspace null proven; hardware posture and angles unproven',
  getHinge:
    'Android suite missing; iOS flat workspace null reads proven; hardware posture and angles unproven',
  onHingeChange:
    'Android suite missing; iOS flat workspace initial null callbacks and cleanup calls proven; hardware events and callback suppression after removal unproven',
  useReservedRegions:
    'Android suite missing; iOS flat workspace empty active/all regions proven; nonempty filtering unproven',
  useReservedRegionsReady:
    'Android suite missing; iOS flat workspace first native reading and two remounts proven',
  useWindowSegments:
    'Android suite missing; iOS flat workspace one segment tracks provider resize; folding segments unproven',
  useSpanning:
    'Android suite missing; iOS flat workspace false proven; spanning divisions unproven',
}
// A suite may exercise an export while a presentation-specific variant still
// lacks runtime proof. Keep those limits visible in the generated table.
const partialGaps: Record<string, string> = {
  Widgets:
    'bounded iOS Home scalar/JSX fixture; Android references unavailable checks; root/aggregate unaccepted',
  LiveActivities:
    'bounded iOS cover-sheet scalar/JSX and expanded JSX Island fixture; Android supported rendering, compact/minimal, scalar Island and hardware-lock unproven; root/aggregate unaccepted',
  'iOS.WidgetUI':
    'bounded Home JSX, cover-sheet JSX and expanded JSX Island fixture; compact/minimal and hardware-lock unproven; root/aggregate unaccepted',
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
  // zoom navigates from its source screen to a separate destination fixture.
  suites.push({ suite: 'zoom', route: 'zoom-detail' })
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

  // standalone suites use an AppRegistry entry instead of a router screen.
  // receipts are checked separately with scripts/native-coverage-receipts.ts.
  for (const platform of ['android', 'ios'] as const) {
    if (platform === 'android') {
      for (const name of exportsUsed(read('fixtures/one-unavailable-services.ts'))) {
        proof.android.set(name, [
          ...(proof.android.get(name) ?? []),
          'native-modules:unavailable',
        ])
      }
    }
    for (const name of exportsUsed(read('fixtures/one-native-modules.tsx'))) {
      proof[platform].set(name, [...(proof[platform].get(name) ?? []), 'native-modules'])
    }
  }

  // the bounded external acceptance unit selects three APIs from this mode.
  const services = exportsUsed(read('fixtures/realapps-api-services.native.tsx'))
  for (const api of iosExternalAcceptanceAPIs) {
    const name = api.replace(/^One\./, '')
    expect(modeAPIs('external', 'ios')).toContain(api)
    expect(services.has(name), `${api} external fixture`).toBe(true)
    proof.ios.set(name, [...(proof.ios.get(name) ?? []), 'realapps:external'])
  }

  // registration records the bounded fixture, never a successful runtime run.
  const widgets = exportsUsed(read('fixtures/realapps-api-widgets.ios.tsx'))
  for (const api of modeAPIs('widgets', 'ios')) {
    const name = api.replace(/^One\./, '')
    expect(widgets.has(name), `${api} widget fixture`).toBe(true)
    proof.ios.set(name, [...(proof.ios.get(name) ?? []), 'realapps:widgets'])
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
      'Generated by `packages/one/tests/nativeCoverage.test.ts` (`vitest -u` rewrites it).',
      'A cell names the conformance suites whose fixture uses the export.',
      'Suite names record fixture references, not successful runs or complete behavior coverage.',
      '`native-modules:unavailable` references rejection checks, not proof of a supported implementation.',
      'Run receipts stay outside Git and are checked with `bun scripts/native-coverage-receipts.ts <evidence-root>`.',
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
