import { Platform } from 'react-native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refetchLoader, refetchMatchLoader } from './useLoader'
import { getClientMatchesSnapshot, setClientMatches } from './useMatches'

describe('refetchLoader on native', () => {
  const webOS = Platform.OS

  beforeEach(() => {
    vi.stubEnv('TAMAGUI_TARGET', 'native')
    vi.stubEnv('ONE_SERVER_URL', 'https://api.example.com')
    vi.stubEnv('NODE_ENV', 'production')
    Object.assign(Platform, { OS: 'ios' })
  })

  afterEach(() => {
    Object.assign(Platform, { OS: webOS })
    setClientMatches([])
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it.each(['ios', 'android'] as const)('reloads fresh data on %s', async (platform) => {
    Object.assign(Platform, { OS: platform })
    const now = vi.spyOn(Date, 'now').mockReturnValue(1000)
    let count = 1
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response(`exports.loader = () => ({ count: ${++count} })`)
    )
    vi.stubGlobal('fetch', fetchMock)
    setClientMatches([
      {
        routeId: './posts/[slug].tsx',
        pathname: '/posts/hello',
        params: { slug: 'hello' },
        loaderData: { count: 1 },
      },
    ])

    await refetchLoader('/posts/hello')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    // cache-busted so the server runs the loader, platform so it answers in CJS
    expect(fetchMock.mock.calls[0]![0]).toMatch(
      new RegExp(
        `^https://api\\.example\\.com/assets/posts_hello_refetch_1000__\\d+_vxrn_loader\\.js\\?platform=${platform}$`
      )
    )
    expect(getClientMatchesSnapshot()[0]?.loaderData).toEqual({ count: 2 })
    expect(fetchMock.mock.calls[0]![1]?.signal).toBeInstanceOf(AbortSignal)

    now.mockReturnValue(2000)
    await refetchLoader('/posts/hello')
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[1]![0]).toContain('_refetch_2000_')
    expect(getClientMatchesSnapshot()[0]?.loaderData).toEqual({ count: 3 })
  })

  it('refetches a match in development without replacing other matches', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const fetchMock = vi.fn(
      async () => new Response('exports.loader = () => ({ count: 2 })')
    )
    vi.stubGlobal('fetch', fetchMock)
    setClientMatches([
      {
        routeId: './_layout.tsx',
        pathname: '/',
        params: {},
        loaderData: { title: 'layout' },
      },
      {
        routeId: './posts/[slug].tsx',
        pathname: '/posts/hello',
        params: { slug: 'hello' },
        loaderData: { count: 1 },
      },
    ])

    await refetchMatchLoader('./posts/[slug].tsx', '/posts/hello')

    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock.mock.calls[0]).toEqual([
      expect.stringMatching(
        /^https:\/\/api\.example\.com\/_one\/assets\/posts_hello_refetch_\d+__\d+_vxrn_loader\.js\?platform=ios$/
      ),
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    ])
    expect(getClientMatchesSnapshot().map((match) => match.loaderData)).toEqual([
      { title: 'layout' },
      { count: 2 },
    ])
  })
})
