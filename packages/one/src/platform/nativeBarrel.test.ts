// the build fully specifies a native barrel import as index.native.js unless the
// directory also has an .ios or .android file; then it stays extensionless beside
// the directory's web index.mjs, and a bundler that tries .mjs before .js (expo's
// default metro sourceExts) loads the web build on ios and android. so a service
// selects its android behavior inside index.native, never in a platform file.
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { expect, test } from 'vitest'

const platformRoot = import.meta.dirname

test('no service splits its native build into platform files', () => {
  const split = readdirSync(platformRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter((dir) => existsSync(join(platformRoot, dir, 'index.ts')))
    .filter((dir) =>
      ['index.ios.ts', 'index.android.ts'].some((file) => existsSync(join(platformRoot, dir, file)))
    )
  expect(split).toEqual([])
})
