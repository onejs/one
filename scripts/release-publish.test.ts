import { describe, expect, test } from 'bun:test'
import { publishPackagesWithAuthProbe } from './release-publish'

const packages = ['first', 'second', 'third', 'fourth'].map((name) => ({
  name,
  cwd: `/packages/${name}`,
}))

describe('publishPackagesWithAuthProbe', () => {
  test('skips published versions and authenticates with the first pending package', async () => {
    const calls: string[] = []

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => pkg.name === 'first',
      publish: async (pkg) => {
        calls.push(pkg.name)
      },
      concurrency: 1,
    })

    expect(calls).toEqual(['second', 'third', 'fourth'])
    expect(result).toEqual({
      skipped: ['first'],
      published: ['second', 'third', 'fourth'],
      failed: [],
    })
  })

  test('retries an interactive probe failure before fan-out', async () => {
    const calls: string[] = []
    let probeAttempts = 0

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async () => false,
      publish: async (pkg) => {
        calls.push(pkg.name)
        if (pkg.name === 'second' && probeAttempts++ === 0) {
          throw ''
        }
      },
      concurrency: 1,
    })

    expect(calls).toEqual(['first', 'second', 'second', 'third', 'fourth'])
    expect(result.failed).toEqual([])
  })

  test('does not retry when npm reports the failed probe as published', async () => {
    const calls: string[] = []
    let probeAttempted = false

    const result = await publishPackagesWithAuthProbe({
      packages,
      isPublished: async (pkg) => pkg.name === 'second' && probeAttempted,
      publish: async (pkg) => {
        calls.push(pkg.name)
        if (pkg.name === 'second') {
          probeAttempted = true
          throw ''
        }
      },
      concurrency: 1,
    })

    expect(calls).toEqual(['first', 'second', 'third', 'fourth'])
    expect(result.published).toEqual(['first', 'second', 'third', 'fourth'])
  })

  test('stops before fan-out when the probe fails for another reason', async () => {
    const calls: string[] = []

    await expect(
      publishPackagesWithAuthProbe({
        packages,
        isPublished: async () => false,
        publish: async (pkg) => {
          calls.push(pkg.name)
          if (pkg.name === 'second') {
            throw new Error('registry unavailable')
          }
        },
      })
    ).rejects.toThrow('registry unavailable')

    expect(calls).toEqual(['first', 'second'])
  })
})
