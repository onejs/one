import { existsSync } from 'node:fs'
import { readdir, readFile, rm, rmdir } from 'node:fs/promises'
import { join } from 'node:path'

// bun's incremental install never prunes nested copies orphaned by a version
// migration. the pre-v3 @tamagui/sheet 2.x orphan under this app shadows the
// v3 copy when the tamagui compiler resolves bare specifiers from the app
// root, fataling the build with "Handle.styleable is not a function".
const staleDir = join(
  new URL('.', import.meta.url).pathname,
  '..',
  'node_modules',
  '@tamagui',
  'sheet'
)

async function prune() {
  if (!existsSync(staleDir)) return
  let version = ''
  try {
    version =
      JSON.parse(await readFile(join(staleDir, 'package.json'), 'utf-8')).version ?? ''
  } catch {
    return
  }
  // only remove the pre-v3 orphan, never a legitimate v3 install
  if (!version.startsWith('2.')) return
  await rm(staleDir, { recursive: true, force: true })
  // drop the scope dir when the orphan was its only entry
  const scopeDir = join(staleDir, '..')
  try {
    if ((await readdir(scopeDir)).length === 0) await rmdir(scopeDir)
  } catch {
    // leave it when anything else lives there
  }
  console.info(`pruned stale @tamagui/sheet ${version} orphan`)
}

await prune()
