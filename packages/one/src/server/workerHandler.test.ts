import { afterEach, describe, expect, it, vi } from 'vitest'
import { getLoaderPath } from '../utils/cleanUrl'
import type { One } from '../vite/types'
import { createWorkerHandler, type LazyRoutes } from './workerHandler'

// route files are router-root relative, the way createRoutesManifest emits them
const pageRoute = {
  file: './some-page.tsx',
  page: '/some-page',
  namedRegex: '^/some-page(?:/)?$',
  urlPath: '/some-page',
  urlCleanPath: '/some-page',
  routeKeys: {},
  type: 'ssr',
  middlewares: [],
} satisfies One.BuildInfo['manifest']['pageRoutes'][number]

const apiRoute = {
  file: './api/status+api.ts',
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

// route modules are reached through the server entry's own route map, keyed by
// the router-root prefixed path its `import.meta.glob` produces
const routeKey = `/app/${pageRoute.file.slice(2)}`

const makeServerEntry =
  (importPage: () => Promise<any> = async () => ({})) =>
  async () => ({
    default: {
      render: () => '<html></html>',
      options: { routes: { [routeKey]: importPage } },
    },
  })

const lazyRoutes = {
  serverEntry: makeServerEntry(),
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
    oneOptions: { router: { root: 'app' }, web: { defaultRenderMode: 'ssr' } },
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
      oneOptions: { router: { root: 'app' }, web: { defaultRenderMode: 'ssr' } },
      buildInfo,
      disableModuleCache: true,
      lazyRoutes: {
        ...lazyRoutes,
        serverEntry: makeServerEntry(async () => {
          imports += 1
          return {}
        }),
      },
    }).handleRequest

    await handleRequest(new Request('https://example.com/some-page'))
    await handleRequest(new Request('https://example.com/some-page'))
    expect(imports).toBeGreaterThan(1)
  })

  it('ssg dynamic route answers 404 when routeMap is present and route is missing', async () => {
    const ssgPageRoute = {
      file: './docs/[slug].tsx',
      page: '/docs/[slug]',
      namedRegex: '^/docs/(?<slug>[^/]+?)(?:/)?$',
      urlPath: '/docs/[slug]',
      urlCleanPath: '/docs/[slug]',
      routeKeys: { slug: 'slug' },
      type: 'ssg' as const,
      middlewares: [],
    } satisfies One.BuildInfo['manifest']['pageRoutes'][number]

    const ssgBuildInfo = {
      ...buildInfo,
      routeMap: { '/docs/intro': 'docs/intro.html' },
      manifest: {
        ...buildInfo.manifest,
        pageRoutes: [ssgPageRoute],
      },
    }

    const handleRequest = createWorkerHandler({
      oneOptions: { router: { root: 'app' }, web: { defaultRenderMode: 'ssg' } },
      buildInfo: ssgBuildInfo,
      lazyRoutes,
    }).handleRequest

    const loaderPath = getLoaderPath('/docs/missing', false)
    const res = await handleRequest(new Request(`https://example.com${loaderPath}`))
    expect(res?.status).toBe(200)
    const text = await res?.text()
    expect(text).toContain('__oneError:404')
  })

  it('ssg dynamic route runs loader on demand when routeMap is omitted', async () => {
    const ssgPageRoute = {
      file: './docs/[slug].tsx',
      page: '/docs/[slug]',
      namedRegex: '^/docs/(?<slug>[^/]+?)(?:/)?$',
      urlPath: '/docs/[slug]',
      urlCleanPath: '/docs/[slug]',
      routeKeys: { slug: 'slug' },
      type: 'ssg' as const,
      middlewares: [],
    } satisfies One.BuildInfo['manifest']['pageRoutes'][number]

    const ssgBuildInfo = {
      ...buildInfo,
      routeMap: undefined,
      manifest: {
        ...buildInfo.manifest,
        pageRoutes: [ssgPageRoute],
      },
    }

    const ssgRouteKey = `/app/${ssgPageRoute.file.slice(2)}`
    const handleRequest = createWorkerHandler({
      oneOptions: { router: { root: 'app' }, web: { defaultRenderMode: 'ssg' } },
      buildInfo: ssgBuildInfo,
      lazyRoutes: {
        ...lazyRoutes,
        serverEntry: async () => ({
          default: {
            render: () => '<html></html>',
            options: {
              routes: {
                [ssgRouteKey]: async () => ({
                  loader: async ({ params }: any) => ({ slug: params.slug }),
                }),
              },
            },
          },
        }),
      },
    }).handleRequest

    const loaderPath = getLoaderPath('/docs/getting-started', false)
    const res = await handleRequest(new Request(`https://example.com${loaderPath}`))
    expect(res?.status).toBe(200)
    const text = await res?.text()
    expect(text).not.toContain('ssg route not in routeMap')
    expect(text).toContain('"slug":"getting-started"')
  })
})

