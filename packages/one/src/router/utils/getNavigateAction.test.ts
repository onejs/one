import { describe, it, expect } from 'vitest'
import { getNavigateAction } from './getNavigateAction'

describe('getNavigateAction', () => {
  describe('NAVIGATE', () => {
    it('works', () => {
      const actionState = {
        routes: [
          {
            name: 'page-2',
          },
        ],
      }

      const navigationState = {
        stale: false as const,
        type: 'stack',
        key: 'stack-pWRo04',
        index: 0,
        routeNames: ['_sitemap', 'index', 'page-1', 'page-2'],
        routes: [
          {
            name: 'page-1',
            key: 'page-1-Gc-TeIdZmx_jAcRD-SGcs',
          },
        ],
        preloadedRoutes: [],
      }

      const action = getNavigateAction(actionState, navigationState)

      expect(action).toStrictEqual({
        type: 'NAVIGATE',
        target: 'stack-pWRo04',
        payload: { key: undefined, name: 'page-2', params: {} },
      })
    })

    it('handles params', () => {
      const actionState = {
        routes: [
          {
            name: 'page-1',
            params: {
              foo: 'foo',
              bar: 'bar',
            },
          },
        ],
      }

      const navigationState = {
        stale: false as const,
        type: 'stack',
        key: 'stack-pWRo04',
        index: 0,
        routeNames: ['_sitemap', 'index', 'page-1', 'page-2'],
        routes: [
          {
            name: 'page-1',
            key: 'page-1-Gc-TeIdZmx_jAcRD-SGcs',
          },
        ],
        preloadedRoutes: [],
      }

      const action = getNavigateAction(actionState, navigationState)

      expect(action).toStrictEqual({
        type: 'NAVIGATE',
        target: 'stack-pWRo04',
        payload: {
          key: undefined,
          name: 'page-1',
          params: {
            foo: 'foo',
            bar: 'bar',
          },
        },
      })
    })

    it('handles navigating into nested navigator', () => {
      const actionState = {
        routes: [
          {
            name: 'foo',
            state: {
              routes: [
                {
                  name: 'bar',
                  state: {
                    routes: [
                      {
                        name: 'baz',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }

      const navigationState = {
        stale: false as const,
        type: 'stack',
        key: 'stack-5qQ9ln4FB9',
        index: 0,
        routeNames: ['index', 'foo'],
        routes: [
          {
            name: 'index',
            key: 'index-Kyz4PdQ7ZAvE0XFhBWydM',
          },
        ],
        preloadedRoutes: [],
      }

      const action = getNavigateAction(actionState, navigationState)

      expect(action).toStrictEqual({
        type: 'NAVIGATE',
        target: 'stack-5qQ9ln4FB9',
        payload: {
          key: undefined,
          name: 'foo',
          params: {
            screen: 'bar',
            params: {
              screen: 'baz',
              params: {},
            },
          },
        },
      })
    })

    it('handles navigating into nested navigator with route params', () => {
      const actionState = {
        routes: [
          {
            name: '[level1]',
            params: {
              level1: 'foo',
            },
            state: {
              routes: [
                {
                  name: '[level2]',
                  params: {
                    level1: 'foo',
                    level2: 'bar',
                  },
                  state: {
                    routes: [
                      {
                        name: '[level3]',
                        params: {
                          level1: 'foo',
                          level2: 'bar',
                          level3: 'baz',
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }

      const navigationState = {
        stale: false as const,
        type: 'stack',
        key: 'stack-5qQ9ln4FB9',
        index: 0,
        routeNames: ['index', '[level1]'],
        routes: [
          {
            name: 'index',
            key: 'index-Kyz4PdQ7ZAvE0XFhBWydM',
          },
        ],
        preloadedRoutes: [],
      }

      const action = getNavigateAction(actionState, navigationState)

      expect(action).toStrictEqual({
        type: 'NAVIGATE',
        target: 'stack-5qQ9ln4FB9',
        payload: {
          key: undefined,
          name: '[level1]',
          params: {
            level1: 'foo',
            level2: 'bar', // not actually necessary, but it's how the current implementation works
            screen: '[level2]',
            params: {
              level1: 'foo',
              level2: 'bar',
              level3: 'baz', // not actually necessary, but it's how the current implementation works
              screen: '[level3]',
              params: {
                level1: 'foo',
                level2: 'bar',
                level3: 'baz',
              },
            },
          },
        },
      })
    })

    it('correctly finds out where the states diverge and return an action valid payload', () => {
      const actionState = {
        routes: [
          {
            name: 'foo',
            state: {
              routes: [
                {
                  name: 'bar',
                  state: {
                    routes: [
                      {
                        name: 'baz-2',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
      }

      const navigationState = {
        stale: false as const,
        type: 'stack',
        key: 'stack-aCzOliK0',
        routeNames: ['index', 'foo'],
        index: 0,
        routes: [
          {
            name: 'foo',
            key: 'foo-teuUBQHk',
            state: {
              stale: false as const,
              type: 'stack',
              key: 'stack-XZ3RJRBg',
              routeNames: ['bar'],
              index: 0,
              routes: [
                {
                  name: 'bar',
                  key: 'bar-FDtH59Dj',
                  state: {
                    stale: false as const,
                    type: 'stack',
                    key: 'stack-s3o7RyPD',
                    routeNames: ['baz-1', 'baz-2'],
                    index: 0,
                    routes: [
                      {
                        name: 'baz-1',
                        key: 'baz-1-K2zLhRSZ',
                      },
                    ],
                  },
                },
              ],
            },
          },
        ],
        preloadedRoutes: [],
      }

      const action = getNavigateAction(actionState, navigationState)

      expect(action).toStrictEqual({
        type: 'NAVIGATE',
        target: 'stack-s3o7RyPD',
        payload: {
          key: undefined,
          name: 'baz-2',
          params: {},
        },
      })
    })
  })

  describe('PUSH', () => {
    it('returns a NAVIGATE action with a unique key', () => {
      const actionState = {
        routes: [
          {
            name: 'page-2',
          },
        ],
      }

      const navigationState = {
        stale: false as const,
        type: 'stack',
        key: 'stack-pWRo04',
        index: 0,
        routeNames: ['_sitemap', 'index', 'page-1', 'page-2'],
        routes: [
          {
            name: 'page-1',
            key: 'page-1-Gc-TeIdZmx_jAcRD-SGcs',
          },
        ],
        preloadedRoutes: [],
      }

      const action = getNavigateAction(actionState, navigationState, 'PUSH')

      expect(action).toStrictEqual({
        type: 'NAVIGATE',
        target: 'stack-pWRo04',
        payload: {
          key: action.payload.key /* since this contains a randomly generated nanoid */,
          name: 'page-2',
          params: {},
        },
      })
    })
  })
})
