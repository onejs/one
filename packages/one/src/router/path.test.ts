import { afterEach, describe, expect, it } from 'vitest'
import {
  getPathWithRecoveredDynamicSegment,
  getPathnameWithRecoveredDynamicSegment,
  hasLostDynamicSegment,
  normalizeRoutePathname,
} from './path'

const originalBaseUrl = process.env.EXPO_BASE_URL
const originalNodeEnv = process.env.NODE_ENV

afterEach(() => {
  if (originalBaseUrl === undefined) {
    delete process.env.EXPO_BASE_URL
  } else {
    process.env.EXPO_BASE_URL = originalBaseUrl
  }

  if (originalNodeEnv === undefined) {
    delete process.env.NODE_ENV
  } else {
    process.env.NODE_ENV = originalNodeEnv
  }
})

describe('hasLostDynamicSegment', () => {
  it('detects a literal "undefined" segment', () => {
    expect(hasLostDynamicSegment('/p/undefined')).toBe(true)
    expect(hasLostDynamicSegment('/users/undefined/posts')).toBe(true)
    expect(hasLostDynamicSegment('/undefined')).toBe(true)
  })

  it('does not match "undefined" inside another segment', () => {
    expect(hasLostDynamicSegment('/p/undefined-things')).toBe(false)
    expect(hasLostDynamicSegment('/p/notundefined')).toBe(false)
    expect(hasLostDynamicSegment('/p/foo-undefined-bar')).toBe(false)
  })

  it('ignores search and hash values', () => {
    expect(hasLostDynamicSegment('/p/undefined?tab=profile')).toBe(true)
    expect(hasLostDynamicSegment('/p/mai1015?x=undefined')).toBe(false)
    expect(hasLostDynamicSegment('/p/mai1015#undefined')).toBe(false)
  })
})

describe('normalizeRoutePathname', () => {
  it('strips search, hash, and trailing slash', () => {
    expect(normalizeRoutePathname('/p/mai1015/?tab=profile#top')).toBe('/p/mai1015')
    expect(normalizeRoutePathname('/')).toBe('/')
  })

  it('strips the production base url', () => {
    process.env.NODE_ENV = 'production'
    process.env.EXPO_BASE_URL = '/expo/prefix'

    expect(normalizeRoutePathname('/expo/prefix/p/mai1015?tab=profile')).toBe(
      '/p/mai1015'
    )
  })
})

describe('getPathWithRecoveredDynamicSegment', () => {
  it('uses the first uncorrupted candidate path', () => {
    expect(
      getPathWithRecoveredDynamicSegment(
        ['/p/undefined', '/p/mai1015?tab=profile'],
        '/p/browser?tab=profile'
      )
    ).toBe('/p/mai1015?tab=profile')
  })

  it('keeps an empty uncorrupted candidate path', () => {
    expect(getPathWithRecoveredDynamicSegment([''], '/browser')).toBe('')
  })

  it('falls back when every candidate path is corrupted', () => {
    expect(
      getPathWithRecoveredDynamicSegment(['/p/undefined'], '/p/browser?tab=profile')
    ).toBe('/p/browser?tab=profile')
  })
})

describe('getPathnameWithRecoveredDynamicSegment', () => {
  it('normalizes the recovered browser pathname', () => {
    process.env.NODE_ENV = 'production'
    process.env.EXPO_BASE_URL = '/expo/prefix'

    expect(
      getPathnameWithRecoveredDynamicSegment(
        '/p/undefined',
        '/expo/prefix/p/mai1015?tab=profile'
      )
    ).toBe('/p/mai1015')
  })
})
