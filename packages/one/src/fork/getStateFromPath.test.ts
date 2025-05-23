import { beforeEach, describe, expect, it } from 'vitest'
import { getMockConfig } from '../testing-utils'
import { getPathFromState } from './getPathFromState'
import { getStateFromPath } from './getStateFromPath'
import { getUrlWithReactNavigationConcessions, stripBaseUrl } from './getStateFromPath-mods'



describe(stripBaseUrl, () => {
  ;[
    [
      // Input
      '/',
      // Base Path
      '',
      // Result
      '/',
    ],
    ['/one/two', '/one', '/two'],
    ['/one/two', '/one/two', ''],
    ['/one/two/', '/one/two', '/'],
    ['///one/', '/one', '/'],
    ['one/', '/one', 'one/'],
    ['/a/b', '/one', '/a/b'],
  ].forEach(([path, baseUrl, result]) => {
    it(`strips baseUrl "${path}"`, () => {
      expect(stripBaseUrl(path, baseUrl)).toBe(result)
    })
  })
})

describe('baseUrl', () => {
  beforeEach(() => {
    process.env.ONE_DEFAULT_RENDER_MODE = 'spa'
  })

  it('accounts for baseUrl', () => {
    process.env.EXPO_BASE_URL = '/expo/prefix'

    const path = '/expo/prefix/bar'
    const config = getMockConfig(['_layout.tsx', 'bar.tsx', 'index.tsx'])

    expect(getStateFromPath<object>(path, config)).toEqual({
      routes: [{ name: 'bar', path: '/bar' }],
    })

    expect(getPathFromState(getStateFromPath<object>(path, config)!, config)).toBe(
      '/expo/prefix/bar'
    )
  })

  it('has baseUrl and state that does not match', () => {
    process.env.EXPO_BASE_URL = '/expo'
    const path = '/bar'
    const config = getMockConfig(['_layout.tsx', 'bar.tsx', 'index.tsx'])

    expect(getStateFromPath<object>(path, config)).toEqual({
      routes: [{ name: 'bar', path: '/bar' }],
    })
    expect(getPathFromState(getStateFromPath<object>(path, config)!, config)).toBe('/expo/bar')
  })
})

describe(getUrlWithReactNavigationConcessions, () => {
  beforeEach(() => {
    delete process.env.EXPO_BASE_URL
  })

  ;['/', 'foo/', 'foo/bar/', 'foo/bar/baz/'].forEach((path) => {
    it(`returns the pathname for ${path}`, () => {
      expect(getUrlWithReactNavigationConcessions(path).nonstandardPathname).toBe(path)
    })
  })

  ;[
    ['', '/'],
    ['https://acme.com/hello/world?foo=bar#123', 'hello/world/'],
    ['https://acme.com/hello/world/?foo=bar#123', 'hello/world/'],
  ].forEach(([url, expected]) => {
    it(`returns the pathname for ${url}`, () => {
      expect(getUrlWithReactNavigationConcessions(url).nonstandardPathname).toBe(expected)
    })
  })

  ;[
    ['/gh-pages/', '/'],
    ['https://acme.com/gh-pages/hello/world?foo=bar#123', 'hello/world/'],
    ['https://acme.com/gh-pages/hello/world/?foo=bar#123', 'hello/world/'],
  ].forEach(([url, expected]) => {
    it(`returns the pathname for ${url}`, () => {
      expect(getUrlWithReactNavigationConcessions(url, 'gh-pages').nonstandardPathname).toBe(
        expected
      )
    })
  })
})

describe('hash', () => {
  it(`parses hashes`, () => {
    expect(
      getStateFromPath('/hello#123', {
        screens: {
          hello: 'hello',
        },
      } as any)
    ).toEqual({
      routes: [
        {
          name: 'hello',
          path: '/hello#123',
          params: {
            '#': '123',
          },
        },
      ],
    })
  })

  it('parses hashes with dynamic routes', () => {
    expect(getStateFromPath('/hello#123', getMockConfig(['[hello]']))).toEqual({
      routes: [
        {
          name: '[hello]',
          params: {
            hello: 'hello',
            '#': '123',
          },
          path: '/hello#123',
        },
      ],
    })
  })

  it('parses hashes with query params', () => {
    expect(getStateFromPath('/?#123', getMockConfig(['index']))).toEqual({
      routes: [
        {
          name: 'index',
          path: '/?#123',
          params: {
            '#': '123',
          },
        },
      ],
    })

    // TODO: Test rest params
  })
})

it(`supports spaces`, () => {
  expect(
    getStateFromPath('/hello%20world', {
      screens: {
        'hello world': 'hello world',
      },
    } as any)
  ).toEqual({
    routes: [
      {
        name: 'hello world',
        path: '/hello%20world',
      },
    ],
  })

  expect(getStateFromPath('/hello%20world', getMockConfig(['[hello world]']))).toEqual({
    routes: [
      {
        name: '[hello world]',
        params: {
          'hello world': 'hello world',
        },
        path: '/hello%20world',
      },
    ],
  })

  // TODO: Test rest params
})

// TODO
it.skip(`matches against dynamic groups`, () => {
  /*
   * This will match (app)/([user])/[user]/index with a user = '(explore)'
   * It may appear that '(explore)' is a group name but there is not value to match '[user]'
   * So it doesn't match any routes in the '(explore)' group
   * Therefore, '(explore)' is used as the value for '[user]'
   */
  expect(
    getStateFromPath(
      '/(app)/(explore)',
      getMockConfig([
        '+not-found',
        '(app)/_layout',
        '(app)/(explore)/_layout',
        '(app)/(explore)/[user]/index',
        '(app)/(explore)/explore',

        '(app)/([user])/_layout',
        '(app)/([user])/[user]/index',
        '(app)/([user])/explore',
      ])
    )
  ).toEqual({
    routes: [
      {
        name: '(app)',
        params: { user: '(explore)' },
        state: {
          routes: [
            {
              name: '([user])',
              params: { user: '(explore)' },
              state: {
                routes: [
                  {
                    name: '[user]/index',
                    params: { user: '(explore)' },
                    path: '',
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  })
})

it(`adds dynamic route params from all levels of the path`, () => {
  // A route at `app/[foo]/bar/[baz]/other` should get all of the params from the path.
  expect(
    getStateFromPath(
      '/foo/bar/baz/other',

      getMockConfig([
        '[foo]/_layout.tsx',
        '[foo]/bar/_layout.tsx',
        '[foo]/bar/[baz]/_layout.tsx',
        '[foo]/bar/[baz]/other.tsx',
      ])
    )
  ).toEqual({
    routes: [
      {
        name: '[foo]',
        params: { baz: 'baz', foo: 'foo' },
        state: {
          routes: [
            {
              name: 'bar',
              params: { baz: 'baz', foo: 'foo' },
              state: {
                routes: [
                  {
                    name: '[baz]',
                    params: { baz: 'baz', foo: 'foo' },
                    state: {
                      routes: [
                        {
                          name: 'other',
                          params: {
                            baz: 'baz',
                            foo: 'foo',
                          },
                          path: '/foo/bar/baz/other',
                        },
                      ],
                    },
                  },
                ],
              },
            },
          ],
        },
      },
    ],
  })
})

it(`handles not-found routes`, () => {
  expect(getStateFromPath('/missing-page', getMockConfig(['+not-found', 'index']))).toEqual({
    routes: [
      {
        name: '+not-found',
        params: {
          'not-found': ['missing-page'],
        },
        path: '/missing-page',
      },
    ],
  })
})

it(`handles query params`, () => {
  expect(
    getStateFromPath('/?test=true&hello=world&array=1&array=2', getMockConfig(['index.tsx']))
  ).toEqual({
    routes: [
      {
        name: 'index',
        params: {
          test: 'true',
          hello: 'world',
          array: ['1', '2'],
        },
        path: '/?test=true&hello=world&array=1&array=2',
      },
    ],
  })
})

it(`handles query params`, () => {
  expect(
    getStateFromPath('/?test=true&hello=world&array=1&array=2', getMockConfig(['index.tsx']))
  ).toEqual({
    routes: [
      {
        name: 'index',
        params: {
          test: 'true',
          hello: 'world',
          array: ['1', '2'],
        },
        path: '/?test=true&hello=world&array=1&array=2',
      },
    ],
  })
})

// TODO
it.skip(`prioritizes hoisted index routes over dynamic groups`, () => {
  expect(
    getStateFromPath('/(one)', getMockConfig(['(one,two)/index.tsx', '(one,two)/[slug].tsx']))
  ).toEqual({
    routes: [
      {
        name: '(one)/index',
        path: '',
      },
    ],
  })
})
