import { beforeEach, describe, expect, test, vi } from 'vitest'

const host = {
  getDrafts: vi.fn(async () => [
    {
      id: 'submission-1',
      destinationId: 'inbox',
      text: 'Shared article',
      createdAt: 1700000000000,
      pendingDelivery: null,
      items: [
        {
          kind: 'url' as const,
          url: 'https://onestack.dev',
        },
      ],
    },
  ]),
  discardDraft: vi.fn(async () => {}),
}

vi.mock('react-native', () => ({
  NativeModules: {
    OneShareTargetModule: host,
  },
}))

describe('ShareTarget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  test('reads and discards App Group share drafts', async () => {
    const { ShareTarget } = await import('./index.native')
    const drafts = await ShareTarget.getDrafts('group.dev.one.myapp')
    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.id).toBe('submission-1')
    expect(host.getDrafts).toHaveBeenCalledWith('group.dev.one.myapp')

    await ShareTarget.discardDraft('group.dev.one.myapp', 'submission-1')
    expect(host.discardDraft).toHaveBeenCalledWith('group.dev.one.myapp', 'submission-1')
  })

  test('unavailable surface rejects with missing native build error', async () => {
    const { ShareTarget: UnavailableShareTarget } = await import('./unavailable')
    await expect(
      UnavailableShareTarget.getDrafts('group.dev.one.myapp')
    ).rejects.toThrow('ShareTarget.getDrafts needs an iOS or Android build')
    await expect(
      UnavailableShareTarget.discardDraft('group.dev.one.myapp', 'submission-1')
    ).rejects.toThrow('ShareTarget.discardDraft needs an iOS or Android build')
  })
})
