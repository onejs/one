import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { afterAll, beforeAll, expect, it } from 'vitest'
import { appSdkOptions, importedBindings, importedFrameworks } from '../codegen/sdk/selection'

const root = mkdtempSync(join(tmpdir(), 'one-sdk-imports-'))
const files = (base: string, entries: Record<string, string>) => {
  for (const [name, content] of Object.entries(entries)) {
    mkdirSync(dirname(join(base, name)), { recursive: true })
    writeFileSync(join(base, name), content)
  }
}
const project = (name: string, entries: Record<string, string>) => {
  const dir = join(root, name)
  files(dir, { 'package.json': '{"name":"app"}', ...entries })
  return dir
}
const platformRoot = join(root, 'platform')
mkdirSync(platformRoot)

beforeAll(() => {
  // appSdkOptions reads the facade groups the build writes beside the bundle
  execFileSync('bun', [join(import.meta.dirname, '../codegen/sdk/build.ts')])
}, 120_000)
afterAll(() => rmSync(root, { recursive: true, force: true }))

it('finds frameworks by text, reading only dependencies that declare one', () => {
  const app = project('frameworks', {
    'package.json': '{"name":"app","dependencies":{"uses-one":"1","plain":"1"}}',
    // text scanning never parses, so source that does not parse still reports its imports
    'entry.ts': "import { NSUUID } from 'one/ios/Foundation'\nconst broken = <<<\n",
    'node_modules/uses-one/package.json': '{"name":"uses-one","peerDependencies":{"one":"*"}}',
    'node_modules/uses-one/dist/index.js': "import { UIView } from 'one/ios/UIKit'\n",
    'node_modules/plain/package.json': '{"name":"plain","dependencies":{"nested":"1"}}',
    'node_modules/plain/index.js': "import { CLLocation } from 'one/ios/CoreLocation'\n",
    'node_modules/nested/package.json': '{"name":"nested","dependencies":{"one":"*"}}',
    'node_modules/nested/index.js': "import { MKMapView } from 'one/ios/MapKit'\n",
  })
  expect(importedFrameworks(app, platformRoot)).toEqual(['Foundation', 'MapKit', 'UIKit'])
})

it('parses neither lookalike paths nor flow, and falls back to full tables on a parse failure', () => {
  const app = project('parse', {
    'package.json': '{"name":"app","dependencies":{"lib":"1"}}',
    'node_modules/lib/package.json': '{"name":"lib","peerDependencies":{"one":"*"}}',
    'node_modules/lib/flow.js': "// @flow\nconst path = 'x/iphone/ios'\nexport const n: number = 1\n",
    'node_modules/lib/real.js': "// @flow\nimport { CTFont } from 'one/ios/CoreText'\nexport const f: ?CTFont = null\n",
    'node_modules/lib/broken.js': "import 'one/ios/MapKit'\nconst a = <<<\n",
    'angle.ts': "import { UIView } from 'one/ios/UIKit'\nexport const view = <any>UIView\n",
  })
  const found = importedBindings(app, platformRoot)
  expect(found.get('UIKit')).toEqual(new Set(['UIView']))
  expect(found.get('CoreText')).toEqual(new Set(['CTFont']))
  expect(found.get('MapKit')).toBeNull()
})

it('ignores type-only imports and keeps ungrouped interfaces from throwing', () => {
  const app = project('types', {
    'a.ts': "import type { UITableViewDelegate } from 'one/ios/UIKit'\nexport type D = UITableViewDelegate\n",
    'b.ts': "import { UIView, type NSLayoutManagerDelegate } from 'one/ios/UIKit'\nexport const v: NSLayoutManagerDelegate | UIView | undefined = undefined\n",
    'c.ts': "import { type UIViewControllerTransitioningDelegate } from 'one/ios/UIKit'\nexport type T = UIViewControllerTransitioningDelegate\n",
    // an interface imported without `type` is erased by the compiler and has no entries
    'd.ts': "import { UIButton, UITableViewDelegate } from 'one/ios/UIKit'\nexport const b = UIButton\nexport type D = UITableViewDelegate\n",
  })
  expect(importedBindings(app, platformRoot).get('UIKit')).toEqual(new Set(['UIView', 'UIButton', 'UITableViewDelegate']))
  const { entries } = appSdkOptions(app)
  expect(entries?.UIKit.length).toBeGreaterThan(0)
  const typeOnly = project('type-only', {
    'a.ts': "import type { UITableViewDelegate } from 'one/ios/UIKit'\nexport type D = UITableViewDelegate\n",
  })
  expect(appSdkOptions(typeOnly).entries).toEqual({})
})
