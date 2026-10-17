import { Platform } from 'react-native'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { refetchLoader } from './useLoader'
import { getClientMatchesSnapshot, setClientMatches } from './useMatches'

describe('refetchLoader on native', () => {
  const webOS = Platform.OS

  beforeEach(() => {
    vi.stubEnv('TAMAGUI_TARGET', 'native')
    vi.stubEnv('ONE_SERVER_URL', 'https://api.example.com')
    Object.assign(Platform, { OS: 'ios' })
  })

  afterEach(() => {
    Object.assign(Platform, { OS: webOS })
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('reloads the loader from the server instead of clearing its data', async () => {
    const fetchMock = vi.fn(
      async (_url: string, _init?: RequestInit) =>
        new Response('exports.loader = () => ({ count: 2 })')
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
      /^https:\/\/api\.example\.com\/assets\/posts_hello_refetch_\d+__\d+_vxrn_loader\.js\?platform=ios$/
    )
    expect(getClientMatchesSnapshot()[0]?.loaderData).toEqual({ count: 2 })
  })
})
