import { afterEach, describe, expect, it, vi } from 'vitest'
import { getDevServer } from './getDevServer'
import { getURL } from './getURL.native'

vi.mock('./getDevServer', () => ({
  getDevServer: vi.fn(() => ({
    url: 'http://metro.local:8081/',
    bundleLoadedFromServer: true,
  })),
}))

const originalServerUrl = process.env.ONE_SERVER_URL

afterEach(() => {
  process.env.ONE_SERVER_URL = originalServerUrl
  vi.clearAllMocks()
})

describe('getURL native', () => {
  it('prefers explicit ONE_SERVER_URL in dev', () => {
    process.env.ONE_SERVER_URL = 'https://app.example.com/'

    expect(getURL()).toBe('https://app.example.com')
    expect(getDevServer).not.toHaveBeenCalled()
  })

  it('falls back to the dev server when ONE_SERVER_URL is unset', () => {
    delete process.env.ONE_SERVER_URL

    expect(getURL()).toBe('http://metro.local:8081')
    expect(getDevServer).toHaveBeenCalledTimes(1)
  })
})
