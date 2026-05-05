import { describe, expect, it } from 'vitest'
import { normalizeLinkingConfig } from '../link/getLinking'
import { getRoutes } from './getRoutes'
import { getLinkingConfig } from './getLinkingConfig'
import { getMockContext } from '../testing-utils'

describe('getLinkingConfig', () => {
  it('expands configured schemes into prefixes', () => {
    const routes = getRoutes(getMockContext(['_layout.tsx', 'index.tsx']))!
    const linking = getLinkingConfig(routes, true, {
      scheme: 'threepunchconvo',
    })

    expect(linking.prefixes).toEqual([
      'threepunchconvo://',
      'threepunchconvo:///',
    ])
  })

  it('merges explicit prefixes with scheme-derived prefixes', () => {
    const routes = getRoutes(getMockContext(['_layout.tsx', 'index.tsx']))!
    const linking = getLinkingConfig(routes, true, {
      scheme: 'threepunchconvo',
      prefixes: ['threepunchconvo://app'],
    })

    expect(linking.prefixes).toEqual([
      'threepunchconvo://',
      'threepunchconvo:///',
      'threepunchconvo://app',
    ])
  })
})

describe('normalizeLinkingConfig', () => {
  it('merges manifest-default prefixes with user-supplied scheme/prefixes', () => {
    const result = normalizeLinkingConfig(
      { scheme: 'foo', prefixes: ['https://example.test/app'] },
      ['bar://', 'bar:///']
    )

    expect(result.prefixes).toEqual([
      'bar://',
      'bar:///',
      'foo://',
      'foo:///',
      'https://example.test/app',
    ])
  })

  it('falls back to manifest-default prefixes when nothing is configured', () => {
    const result = normalizeLinkingConfig(undefined, ['bar://', 'bar:///'])
    expect(result.prefixes).toEqual(['bar://', 'bar:///'])
  })

  it('dedupes overlapping defaults and configured prefixes', () => {
    const result = normalizeLinkingConfig(
      { scheme: 'foo' },
      ['foo://', 'foo:///']
    )
    expect(result.prefixes).toEqual(['foo://', 'foo:///'])
  })
})
