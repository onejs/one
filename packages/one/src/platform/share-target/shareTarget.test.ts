import { beforeEach, describe, expect, test, vi } from 'vitest'

const host = {
  getDrafts: vi.fn(async () => [
    {
      sessionId: 'session-1',
      createdAt: 1700000000000,
      targetRoute: '/inbox',
      sourceBundleId: 'com.apple.mobilesafari',
      items: [
        {
          id: 'item-1',
          kind: 'url' as const,
          typeIdentifier: 'public.url',
          mimeType: null,
          suggestedName: null,
          text: 'Shared article',
          url: 'https://onestack.dev',
          fileUri: null,
          byteSize: null,
        },
      ],
    },
  ]),
  consumeDraft: vi.fn(async () => {}),
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

  test('reads, consumes, and discards App Group share drafts', async () => {
    const { ShareTarget } = await import('./index.native')
    const drafts = await ShareTarget.getDrafts('group.dev.one.myapp')
    expect(drafts).toHaveLength(1)
    expect(drafts[0]?.sessionId).toBe('session-1')
    expect(host.getDrafts).toHaveBeenCalledWith('group.dev.one.myapp')

    await ShareTarget.consumeDraft('group.dev.one.myapp', 'session-1', {
      removeAttachments: true,
    })
    expect(host.consumeDraft).toHaveBeenCalledWith(
      'group.dev.one.myapp',
      'session-1',
      true
    )

    await ShareTarget.discardDraft('group.dev.one.myapp', 'session-1')
    expect(host.discardDraft).toHaveBeenCalledWith('group.dev.one.myapp', 'session-1')
  })

  test('validates appGroup and sessionId arguments', async () => {
    const { ShareTarget } = await import('./index.native')
    expect(() => ShareTarget.getDrafts(' ')).toThrow(TypeError)
    expect(() => ShareTarget.consumeDraft('group.dev.one.myapp', '')).toThrow(TypeError)
    expect(() => ShareTarget.discardDraft('', 'session-1')).toThrow(TypeError)
  })
})
