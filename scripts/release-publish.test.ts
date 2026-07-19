import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { publishPackagesWithAuthProbe } from './release-publish'

const packages = ['first', 'second', 'third', 'fourth'].map((name) => ({
  name,
  cwd: `/packages/${name}`,
}))

describe('publishPackagesWithAuthProbe', () => {
  test('skips published versions and publishes every pending package in one batch', async () => {
    const batches: string[][] = []

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => pkg.name === 'first',
      publish: async (pending) => {
        batches.push(pending.map((pkg) => pkg.name))
      },
    })

    expect(batches).toEqual([['second', 'third', 'fourth']])
    expect(result).toEqual({
      skipped: ['first'],
      published: ['second', 'third', 'fourth'],
      failed: [],
    })
  })

  test('does not run npm when every version is already published', async () => {
    let publishCalls = 0

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async () => true,
      publish: async () => {
        publishCalls++
      },
    })

    expect(publishCalls).toBe(0)
    expect(result).toEqual({
      skipped: ['first', 'second', 'third', 'fourth'],
      published: [],
      failed: [],
    })
  })

  test('surfaces a batch publish failure', async () => {
    let publishCalls = 0

    await expect(
      publishPackagesWithAuthProbe({
        packages,
        isPublished: async () => false,
        publish: async () => {
          publishCalls++
          throw new Error('registry unavailable')
        },
      })
    ).rejects.toThrow('registry unavailable')

    expect(publishCalls).toBe(1)
  })

  test('npm handles prepared packages as one workspace publish', async () => {
    const root = await mkdtemp(join(tmpdir(), 'one-release-test-'))
    const first = join(root, 'first')
    const second = join(root, 'second')

    try {
      await Promise.all([mkdir(first), mkdir(second)])
      await Promise.all([
        writeFile(
          join(root, 'package.json'),
          JSON.stringify({ private: true, workspaces: ['first', 'second'] })
        ),
        writeFile(
          join(first, 'package.json'),
          JSON.stringify({ name: 'one-release-test-first', version: '0.0.0' })
        ),
        writeFile(
          join(second, 'package.json'),
          JSON.stringify({ name: 'one-release-test-second', version: '0.0.0' })
        ),
      ])

      const process = Bun.spawn(
        [
          'npm',
          'publish',
          '--workspaces',
          '--ignore-scripts',
          '--dry-run',
          '--json',
          '--loglevel',
          'notice',
        ],
        {
          cwd: root,
          env: {
            ...Bun.env,
            NODE_OPTIONS: `--require=${join(import.meta.dir, 'cache-npm-webauth.cjs')}`,
          },
          stdout: 'pipe',
          stderr: 'pipe',
        }
      )
      const [exitCode, , stderr] = await Promise.all([
        process.exited,
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
      ])

      expect(exitCode, stderr).toBe(0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })

  test('reuses one web authentication result inside the npm process', async () => {
    const root = await mkdtemp(join(tmpdir(), 'one-webauth-test-'))
    const moduleDirectory = join(root, 'node_modules', 'npm-profile')

    try {
      await mkdir(moduleDirectory, { recursive: true })
      await writeFile(
        join(moduleDirectory, 'index.js'),
        `let calls = 0
module.exports.webAuthOpener = async () => ({ token: String(++calls) })
`
      )

      const process = Bun.spawn(
        [
          'node',
          '-e',
          `const profile = require('npm-profile'); Promise.all([profile.webAuthOpener(), profile.webAuthOpener()]).then(([first, second]) => { if (first.token !== '1' || second.token !== '1') process.exitCode = 1 })`,
        ],
        {
          cwd: root,
          env: {
            ...Bun.env,
            NODE_PATH: join(root, 'node_modules'),
            NODE_OPTIONS: `--require=${join(import.meta.dir, 'cache-npm-webauth.cjs')}`,
          },
          stdout: 'pipe',
          stderr: 'pipe',
        }
      )
      const [exitCode, , stderr] = await Promise.all([
        process.exited,
        new Response(process.stdout).text(),
        new Response(process.stderr).text(),
      ])

      expect(exitCode, stderr).toBe(0)
    } finally {
      await rm(root, { recursive: true, force: true })
    }
  })
})
