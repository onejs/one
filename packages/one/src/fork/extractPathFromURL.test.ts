import { describe, expect, it } from 'vitest'
import { extractPathFromURL } from './extractPathFromURL'
import { getStateFromPath } from './getStateFromPath'
import { getMockConfig } from '../testing-utils'

describe('extractPathFromURL prefixes', () => {
  it('keeps existing custom scheme behavior without prefixes', () => {
    expect(extractPathFromURL([], 'threepunchconvo://thread/123')).toBe('thread/123')
    expect(extractPathFromURL([], 'threepunchconvo:///thread/123')).toBe('thread/123')
  })

  it('strips the longest matching custom scheme prefix', () => {
    expect(
      extractPathFromURL(
        ['threepunchconvo://', 'threepunchconvo://app'],
        'threepunchconvo://app/thread/123'
      )
    ).toBe('thread/123')
  })

  it('strips universal link prefixes', () => {
    expect(
      extractPathFromURL(
        ['https://threepunch.example/app'],
        'https://threepunch.example/app/thread/123?tab=chat'
      )
    ).toBe('thread/123?tab=chat')
    expect(
      extractPathFromURL(
        ['https://threepunch.example/app'],
        'https://threepunch.example/app'
      )
    ).toBe('')
    expect(
      extractPathFromURL(
        ['https://threepunch.example/app'],
        'https://threepunch.example/application/thread/123'
      )
    ).toBe('application/thread/123')
  })

  it('strips a prefix when the boundary is a query or hash', () => {
    expect(
      extractPathFromURL(['threepunchconvo://app'], 'threepunchconvo://app?utm=share')
    ).toBe('?utm=share')
    expect(
      extractPathFromURL(['threepunchconvo://app'], 'threepunchconvo://app#section')
    ).toBe('#section')
    expect(
      extractPathFromURL(
        ['https://threepunch.example/app'],
        'https://threepunch.example/app?ref=share'
      )
    ).toBe('?ref=share')
  })

  it('uses stripped paths for route matching', () => {
    const config = getMockConfig([
      '_layout.tsx',
      'index.tsx',
      'thread/[id].tsx',
      '+not-found.tsx',
    ])
    const path = extractPathFromURL(
      ['threepunchconvo://app'],
      'threepunchconvo://app/thread/123'
    )

    expect(getStateFromPath(path, config)).toEqual({
      routes: [
        {
          name: 'thread/[id]',
          params: { id: '123' },
          key: 'thread/[id]-0',
          path: 'thread/123',
        },
      ],
    })
  })
})
