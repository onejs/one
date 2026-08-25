import { afterEach, describe, expect, it, vi } from 'vitest'
import type { One } from '../vite/types'
import { createWorkerHandler, type LazyRoutes } from './workerHandler'

const pageRoute = {
  file: 'app/some-page.tsx',
  page: '/some-page',
  namedRegex: '^/some-page(?:/)?$',
  urlPath: '/some-page',
  urlCleanPath: '/some-page',
  routeKeys: {},
  type: 'ssr',
  middlewares: [],
} satisfies One.BuildInfo['manifest']['pageRoutes'][number]

const apiRoute = {
  file: 'app/api/status+api.ts',
  page: '/api/status',
  namedRegex: '^/api/status(?:/)?$',
  urlPath: '/api/status',
  urlCleanPath: '/api/status',
  routeKeys: {},
  type: 'api',
  middlewares: [],
} satisfies One.BuildInfo['manifest']['apiRoutes'][number]

const buildInfo = {
  constants: { CACHE_KEY: 'test' },
  routeToBuildInfo: {
    [pageRoute.file]: {
      type: 'ssr',
      path: pageRoute.page,
      routeFile: pageRoute.file,
      middlewares: [],
      preloadPath: '',
      cssPreloadPath: '',
      loaderPath: '',
      cleanPath: pageRoute.page,
      htmlPath: '',
      clientJsPath: '',
      serverJsPath: '',
      params: {},
      preloads: [],
      css: [],
      layoutCSS: [],
    },
  },
  pathToRoute: {},
  routeMap: {},
  manifest: {
    pageRoutes: [pageRoute],
    apiRoutes: [apiRoute],
    allRoutes: [pageRoute, apiRoute],
  },
  preloads: {},
  cssPreloads: {},
  loaders: {},
} satisfies One.BuildInfo

const lazyRoutes = {
  serverEntry: async () => ({
    default: {
      render: () => '<html></html>',
    },
  }),
  pages: {
    [pageRoute.file]: async () => ({}),
  },
  api: {
    [apiRoute.page]: async () => ({
      HEAD: () => new Response(null, { status: 204 }),
    }),
  },
  middlewares: {},
} satisfies LazyRoutes

function createHandler() {
  vi.stubEnv('ONE_BUFFERED_SSR', '1')
  return createWorkerHandler({
    oneOptions: { web: { defaultRenderMode: 'ssr' } },
    buildInfo,
    lazyRoutes,
  }).handleRequest
}

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('createWorkerHandler', () => {
  it('routes HEAD requests to page handlers', async () => {
    const response = await createHandler()(
      new Request('https://example.com/some-page', { method: 'HEAD' })
    )

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)
  })

  it('routes GET requests to page handlers', async () => {
    const response = await createHandler()(
      new Request('https://example.com/some-page')
    )

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(200)
  })

  it('does not route POST requests to page handlers', async () => {
    const response = await createHandler()(
      new Request('https://example.com/some-page', { method: 'POST' })
    )

    expect(response).toBeNull()
  })

  it('continues routing HEAD requests to API handlers', async () => {
    const response = await createHandler()(
      new Request('https://example.com/api/status', { method: 'HEAD' })
    )

    expect(response).toBeInstanceOf(Response)
    expect(response?.status).toBe(204)
  })
})
