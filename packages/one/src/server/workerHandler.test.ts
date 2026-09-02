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
  it('answers HEAD page requests exactly like GET', async () => {
    const handleRequest = createHandler()
    const get = await handleRequest(new Request('https://example.com/some-page'))
    const head = await handleRequest(
      new Request('https://example.com/some-page', { method: 'HEAD' })
    )

    if (!(get instanceof Response) || !(head instanceof Response)) {
      throw new Error('expected both GET and HEAD to return a Response')
    }
    // workerd drops the body for HEAD, so the handler must agree with GET on
    // status and content type. asserting an empty body here would only be
    // asserting the transport's job.
    expect(get.status).toBe(200)
    expect(head.status).toBe(get.status)
    expect(head.headers.get('content-type')).toBe(get.headers.get('content-type'))
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

  it('disableModuleCache re-imports the page module on each request', async () => {
    vi.stubEnv('ONE_BUFFERED_SSR', '1')
    let imports = 0
    const handleRequest = createWorkerHandler({
      oneOptions: { web: { defaultRenderMode: 'ssr' } },
      buildInfo,
      disableModuleCache: true,
      lazyRoutes: {
        ...lazyRoutes,
        pages: {
          [pageRoute.file]: async () => {
            imports += 1
            return {}
          },
        },
      },
    }).handleRequest

    await handleRequest(new Request('https://example.com/some-page'))
    await handleRequest(new Request('https://example.com/some-page'))
    expect(imports).toBeGreaterThan(1)
  })
})
