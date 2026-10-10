import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createRequire } from 'node:module'
import { join, resolve, dirname } from 'node:path'
import { homedir } from 'node:os'
if (!process.argv[2] || !process.argv[3])
  throw new Error('Expected <installed Basic root> <output directory>')
const root = resolve(process.argv[2])
const out = resolve(process.argv[3])
const require = createRequire(join(root, 'package.json'))
const manifestPath = require.resolve('one/package.json')
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
const file = join(dirname(manifestPath), 'dist/esm/router/web/WebStackNavigator.mjs')
const original = readFileSync(file, 'utf8')
const changed = original
  .replace(
    'state, navigation, descriptors, render }',
    'state, navigation, descriptors, NavigationContent }'
  )
  .replace(
    'return render(/* @__PURE__ */ jsx(WebStackView, {',
    'return jsx(NavigationContent, {children: jsx(WebStackView, {'
  )
  .replace(
    'customChildren: headlessChildren\n\t}));',
    'customChildren: headlessChildren\n\t})});'
  )
if (changed === original || changed.includes('return render('))
  throw new Error('Expected the published navigation consumer')
// detach this private install from bun cache hardlinks before changing source.
unlinkSync(file)
writeFileSync(file, changed)
try {
  const result = spawnSync(
    'bash',
    [
      join(homedir(), 'contrast/scripts/heavy.sh'),
      '--cores',
      '3',
      '--',
      'bunx',
      '--no-install',
      'one',
      'build',
    ],
    { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, timeout: 20 * 60 * 1000 }
  )
  await Bun.write(join(out, 'negative.log'), result.stdout + result.stderr)
  if (
    result.status === 0 ||
    !/Element type is invalid|got: undefined|Minified React error #130[^\n]*args\[\]=undefined/i.test(
      result.stdout + result.stderr
    )
  )
    throw new Error(
      'Expected old NavigationContent source to fail on the same alpha.40 clean install'
    )
  await Bun.write(
    join(out, 'negative.json'),
    JSON.stringify(
      {
        label: 'RAN',
        one: manifest.version,
        sourceCommit: manifest.releaseSourceCommit,
        core: manifest.peerDependencies['@react-navigation/core'],
        change:
          'Only the WebStackNavigator consumer restored to NavigationContent from pre-81558502b source shape',
        status: result.status,
        expectedFailure: 'Element type is invalid / undefined NavigationContent',
        publishedSourceSha256: createHash('sha256').update(original).digest('hex'),
      },
      null,
      2
    )
  )
} finally {
  writeFileSync(file, original)
}
