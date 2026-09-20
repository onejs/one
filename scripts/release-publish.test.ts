import { describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  ensureNpmAuthentication,
  isExactVersionPublishedOnNpm,
  isGitHubTrustedPublishingEnvironment,
  publishPackagesWithAuthProbe,
} from './release-publish'

const packages = ['first', 'second', 'third', 'fourth'].map((name) => ({
  name,
  cwd: `/packages/${name}`,
}))

describe('ensureNpmAuthentication', () => {
  test('checks npm authentication even when CI is set locally', async () => {
    let whoamiCalls = 0

    await ensureNpmAuthentication({
      env: { CI: 'true' },
      whoami: async () => {
        whoamiCalls++
      },
      login: async () => {
        throw new Error('should not prompt')
      },
    })

    expect(whoamiCalls).toBe(1)
  })

  test('waits for login and checks npm authentication again', async () => {
    let whoamiCalls = 0
    let loginPrompts = 0

    await ensureNpmAuthentication({
      env: {},
      whoami: async () => {
        whoamiCalls++
        if (whoamiCalls === 1) {
          throw new Error('not authenticated')
        }
      },
      login: async () => {
        loginPrompts++
      },
    })

    expect(whoamiCalls).toBe(2)
    expect(loginPrompts).toBe(1)
  })

  test('fails clearly when npm is still unauthenticated after login', async () => {
    let whoamiCalls = 0

    await expect(
      ensureNpmAuthentication({
        env: {},
        whoami: async () => {
          whoamiCalls++
          throw new Error('401 Unauthorized')
        },
        login: async () => {
          throw new Error('login canceled')
        },
      })
    ).rejects.toThrow('npm is still not authenticated')

    expect(whoamiCalls).toBe(2)
  })

  test('skips npm authentication only for GitHub trusted publishing', async () => {
    const env = {
      CI: 'true',
      GITHUB_ACTIONS: 'true',
      ACTIONS_ID_TOKEN_REQUEST_URL: 'https://example.test/token',
      ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'token',
    }
    let whoamiCalls = 0

    await ensureNpmAuthentication({
      env,
      whoami: async () => {
        whoamiCalls++
      },
      login: async () => {},
    })

    expect(isGitHubTrustedPublishingEnvironment(env)).toBe(true)
    expect(whoamiCalls).toBe(0)
  })
})

describe('publishPackagesWithAuthProbe', () => {
  test('retries exact scoped-package registry checks with a fresh uncached URL', async () => {
    const requests: { url: string; init?: RequestInit }[] = []
    let registryCalls = 0

    const registryFetch = async (url: string, init?: RequestInit) => {
      requests.push({ url, init })
      registryCalls++

      if (registryCalls === 1) {
        return new Response('unavailable', { status: 503 })
      }
      if (registryCalls === 2) {
        throw new Error('connection reset')
      }

      return Response.json({
        version: registryCalls === 3 ? '2.0.0-beta.50.1' : '2.0.0-beta.51.1',
      })
    }

    const result = await publishPackagesWithAuthProbe({
      packages: [{ name: '@vxrn/native', cwd: '/packages/native' }],
      isPublished: async () => false,
      verifyPublished: (pkg, attempt) =>
        isExactVersionPublishedOnNpm({
          name: pkg.name,
          version: '2.0.0-beta.51.1',
          attempt,
          fetcher: registryFetch,
        }),
      publish: async () => {},
      verifyTimeoutMs: 1_000,
      verifyIntervalMs: 0,
      wait: async () => {},
    })

    const urls = requests.map(({ url }) => new URL(url))
    const cacheBusts = urls.map((url) => url.searchParams.get('cache-bust'))

    expect(urls.map((url) => url.pathname)).toEqual([
      '/%40vxrn%2Fnative/2.0.0-beta.51.1',
      '/%40vxrn%2Fnative/2.0.0-beta.51.1',
      '/%40vxrn%2Fnative/2.0.0-beta.51.1',
      '/%40vxrn%2Fnative/2.0.0-beta.51.1',
    ])
    expect(new Set(cacheBusts).size).toBe(4)
    expect(cacheBusts.map((value) => value?.split('-').at(-1))).toEqual([
      '1',
      '2',
      '3',
      '4',
    ])
    expect(
      requests.map(({ init }) => new Headers(init?.headers).get('Cache-Control'))
    ).toEqual(['no-cache', 'no-cache', 'no-cache', 'no-cache'])
    expect(result).toEqual({
      skipped: [],
      published: ['@vxrn/native'],
      failed: [],
    })
  })

  test('skips published versions and publishes every pending package in one batch', async () => {
    const batches: string[][] = []
    const onRegistry = new Set(['first'])

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => onRegistry.has(pkg.name),
      publish: async (pending) => {
        batches.push(pending.map((pkg) => pkg.name))
        for (const pkg of pending) {
          onRegistry.add(pkg.name)
        }
      },
    })

    expect(batches).toEqual([['second', 'third', 'fourth']])
    expect(result).toEqual({
      skipped: ['first'],
      published: ['second', 'third', 'fourth'],
      failed: [],
    })
  })

  test('waits for the registry to catch up instead of failing a slow publish', async () => {
    const onRegistry = new Set<string>()
    const waits: number[] = []
    let checks = 0

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => {
        checks++
        return onRegistry.has(pkg.name)
      },
      publish: async (pending) => {
        // the registry accepts the tarballs now and publishes the version
        // documents later, which is what a real workspace publish does
        setTimeout(() => {
          for (const pkg of pending) {
            onRegistry.add(pkg.name)
          }
        }, 0)
      },
      verifyIntervalMs: 1,
      wait: async (ms) => {
        waits.push(ms)
        await new Promise((resolve) => setTimeout(resolve, ms))
      },
    })

    expect(waits.length).toBeGreaterThan(0)
    expect(checks).toBeGreaterThan(packages.length)
    expect(result).toEqual({
      skipped: [],
      published: ['first', 'second', 'third', 'fourth'],
      failed: [],
    })
  })

  test('fails the release when a package never reaches the registry', async () => {
    const onRegistry = new Set<string>()

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => onRegistry.has(pkg.name),
      publish: async (pending) => {
        // npm exits 0 while quietly leaving one package unpublished
        for (const pkg of pending) {
          if (pkg.name !== 'third') {
            onRegistry.add(pkg.name)
          }
        }
      },
      verifyTimeoutMs: 20,
      verifyIntervalMs: 1,
      wait: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms))
      },
    })

    expect(result).toEqual({
      skipped: [],
      published: ['first', 'second', 'fourth'],
      failed: ['third'],
    })
  })

  test('treats a registry error mid-poll as not-yet-published, not as a verdict', async () => {
    const onRegistry = new Set<string>()
    let published = false
    let failedLookups = 0

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => {
        if (published && failedLookups < packages.length) {
          failedLookups++
          throw new Error('registry 503')
        }
        return onRegistry.has(pkg.name)
      },
      publish: async (pending) => {
        published = true
        for (const pkg of pending) {
          onRegistry.add(pkg.name)
        }
      },
      verifyIntervalMs: 1,
      wait: async (ms) => {
        await new Promise((resolve) => setTimeout(resolve, ms))
      },
    })

    expect(failedLookups).toBe(packages.length)
    expect(result.failed).toEqual([])
    expect(result.published).toEqual(['first', 'second', 'third', 'fourth'])
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
