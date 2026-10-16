import { afterEach, expect, test } from 'bun:test'
import { createRequire } from 'node:module'
import { lstat, mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const root = resolve(import.meta.dir, '..')
const fixtures: string[] = []
afterEach(async () => {
  await Promise.all(fixtures.splice(0).map((dir) => rm(dir, { recursive: true })))
})

test.each([{ private: true }, { skipPublish: true }])(
  'local releases leave unpublished workspaces linked: %j',
  async (unpublished) => {
    const dir = await mkdtemp(join(tmpdir(), 'one-local-release-'))
    fixtures.push(dir)
    const consumer = join(dir, 'consumer')
    const publicPackage = join(dir, 'packages/one')
    const unpublishedPackage = join(dir, 'apps/local-app')
    await Promise.all(
      [publicPackage, unpublishedPackage, join(consumer, 'node_modules/one')].map(
        (path) => mkdir(path, { recursive: true })
      )
    )
    await writeFile(
      join(dir, 'package.json'),
      JSON.stringify({ workspaces: ['packages/*', 'apps/*'] })
    )
    for (const [directory, manifest] of [
      [publicPackage, { name: 'one', version: '2.7.0', main: 'payload.js' }],
      [
        unpublishedPackage,
        { name: 'local-app', version: '1.0.0', main: 'payload.js', ...unpublished },
      ],
    ] as const) {
      await writeFile(join(directory, 'package.json'), JSON.stringify(manifest))
      await writeFile(
        join(directory, 'payload.js'),
        'exports.double = (value) => value * 2'
      )
    }
    await writeFile(
      join(consumer, 'node_modules/one/package.json'),
      JSON.stringify({ name: 'one', version: '2.6.0', main: 'payload.js' })
    )
    await writeFile(
      join(consumer, 'node_modules/one/payload.js'),
      'exports.double = () => 0'
    )
    await symlink(unpublishedPackage, join(consumer, 'node_modules/local-app'))
    const result = Bun.spawnSync(
      [
        process.execPath,
        join(root, 'scripts/release.ts'),
        '--into',
        consumer,
        '--skip-build',
      ],
      { cwd: dir, stdout: 'pipe', stderr: 'pipe' }
    )
    expect({ code: result.exitCode, stderr: result.stderr.toString() }).toMatchObject({
      code: 0,
    })
    const requireConsumer = createRequire(join(consumer, 'package.json'))
    expect(requireConsumer('one').double(3)).toBe(6)
    expect((await lstat(join(consumer, 'node_modules/local-app'))).isSymbolicLink()).toBe(
      true
    )
  }
)
