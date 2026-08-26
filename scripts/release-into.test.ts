import { expect, test } from 'bun:test'
import { mkdtemp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

test('release --into replaces each installed package with its packed contents', async () => {
  const root = await mkdtemp(join(tmpdir(), 'one-release-into-test-'))
  const packageDirectory = join(root, 'packages', 'one')
  const targetDirectory = join(root, 'target')
  const installedDirectory = join(targetDirectory, 'node_modules', 'one')

  try {
    await Promise.all([
      mkdir(packageDirectory, { recursive: true }),
      mkdir(installedDirectory, { recursive: true }),
    ])
    await Promise.all([
      writeFile(
        join(root, 'package.json'),
        JSON.stringify({
          private: true,
          workspaces: ['packages/*'],
          scripts: { build: 'node -e "process.exit(0)"' },
        })
      ),
      writeFile(
        join(packageDirectory, 'package.json'),
        JSON.stringify({ name: 'one', version: '1.25.7' })
      ),
      writeFile(join(packageDirectory, 'fresh.js'), 'export const source = "local"\n'),
      writeFile(
        join(installedDirectory, 'stale.js'),
        'export const source = "registry"\n'
      ),
    ])

    const releaseStartedAt = Date.now()
    const process = Bun.spawn(
      ['bun', join(import.meta.dir, 'release.ts'), '--into', targetDirectory],
      {
        cwd: root,
        stdout: 'pipe',
        stderr: 'pipe',
      }
    )
    const [exitCode, stdout, stderr] = await Promise.all([
      process.exited,
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
    ])

    expect(exitCode, stderr).toBe(0)
    expect(stdout).toContain('Installing 1 local packages:\n  one')
    expect(stdout).toContain('Released 1 packages')
    expect(await readFile(join(installedDirectory, 'fresh.js'), 'utf8')).toBe(
      'export const source = "local"\n'
    )
    expect(
      (await stat(join(installedDirectory, 'fresh.js'))).ctimeMs
    ).toBeGreaterThanOrEqual(releaseStartedAt)
    await expect(stat(join(installedDirectory, 'stale.js'))).rejects.toThrow()
  } finally {
    await rm(root, { recursive: true, force: true })
  }
})
