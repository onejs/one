import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createHandleRequest } from './createHandleRequest'

// Mock the manifest. Specific routes come before dynamic ones, matching how
// the real manifest is ordered after matchers.sortRoutes().
vi.mock('./vite/getManifest', () => ({
  getManifest: () => ({
    pageRoutes: [
      {
        file: 'app/index.tsx',
        page: '/',
        namedRegex: '^/(?:/)?$',
        routeKeys: {},
        type: 'ssr',
        middlewares: [],
      },
      {
        file: 'app/(public)/otp+ssg.tsx',
        page: '/otp',
        namedRegex: '^/otp(?:/)?$',
        routeKeys: {},
        type: 'ssg',
        middlewares: [],
        hasLoader: false,
      },
      {
        file: 'app/(public)/profile+ssg.tsx',
        page: '/profile',
        namedRegex: '^/profile(?:/)?$',
        routeKeys: {},
        type: 'ssg',
        middlewares: [],
        hasLoader: true,
      },
      {
        file: 'app/[slug].tsx',
        page: '/[slug]',
        namedRegex: '^/(?<nxtPslug>[^/]+?)(?:/)?$',
        routeKeys: { nxtPslug: 'slug' },
        type: 'ssr',
        middlewares: [],
      },
      {
        file: 'app/+not-found.tsx',
        page: '/+not-found',
        namedRegex: '^/(?<nxtPnotfound>.+?)(?:/)?$',
        routeKeys: { nxtPnotfound: 'not-found' },
        type: 'spa',
        middlewares: [],
      },
    ],
    apiRoutes: [
      {
        file: 'app/api/github/agent/run.sh+api.ts',
        page: '/api/github/agent/run.sh',
        namedRegex: '^/api/github/agent/run\\.sh(?:/)?$',
        routeKeys: {},
        type: 'api',
        middlewares: [],
      },
    ],
  }),
}))

function createRequest(path: string) {
  return new Request(`http://localhost:3000${path}`, {
    headers: {
      host: 'localhost:3000',
    },
  })
}

describe('createHandleRequest', () => {
  const mockHandlers = {
    handlePage: vi.fn().mockResolvedValue('<html></html>'),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('static file extension filtering', () => {
    it('should skip paths with file extensions (favicon.ico)', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/favicon.ico'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should skip paths with file extensions (logo.png)', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/logo.png'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should skip paths with file extensions (styles.css)', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/styles.css'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should skip paths with file extensions (robots.txt)', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/robots.txt'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should skip nested paths with file extensions', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/assets/images/logo.png'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should skip extensions 2-4 chars like .xyz', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/somefile.xyz'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should skip common static extensions longer than 4 chars', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/font.woff2'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should not render a user +not-found page for sourcemap requests', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/deps-web/react-BwkDMLyL.js.map'))
      expect(result).toBeNull()
      expect(mockHandlers.handlePage).not.toHaveBeenCalled()
    })

    it('should still route static-looking API paths', async () => {
      const mockHandlersWithAPI = {
        handlePage: vi.fn().mockResolvedValue('<html></html>'),
        handleAPI: vi.fn().mockResolvedValue({
          GET: () => new Response('script'),
        }),
      }
      const { handler } = createHandleRequest(mockHandlersWithAPI, {
        routerRoot: '/app',
      })
      const result = (await handler(
        createRequest('/api/github/agent/run.sh')
      )) as Response | null
      expect(result).not.toBeNull()
      expect(await result!.text()).toBe('script')
      expect(mockHandlersWithAPI.handleAPI).toHaveBeenCalled()
      expect(mockHandlersWithAPI.handlePage).not.toHaveBeenCalled()
    })

    it('should not skip non-static extensions in route names', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      await handler(createRequest('/route.normal'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })

    it('should NOT skip loader paths ending with _vxrn_loader.js', async () => {
      const mockHandlersWithLoader = {
        handlePage: vi.fn().mockResolvedValue('<html></html>'),
        handleLoader: vi.fn().mockResolvedValue('loader data'),
      }
      const { handler } = createHandleRequest(mockHandlersWithLoader, {
        routerRoot: '/app',
      })
      // Loader paths are /assets/<path>_<nonce>_vxrn_loader.js - they should reach handleLoader
      // for a matching route (the path /my-page matches the [slug] route)
      await handler(createRequest('/assets/my-page_123_vxrn_loader.js'))
      expect(mockHandlersWithLoader.handleLoader).toHaveBeenCalled()
    })
  })

  describe('loader dispatch short-circuit for no-loader routes', () => {
    it('should return empty loader module without calling handleLoader when route has hasLoader: false', async () => {
      // Regression: for SSG routes with no loader export, the worker must NOT
      // import the page bundle (which pulls in RN/Tamagui modules that crash
      // when evaluated inside workerd on Cloudflare Workers).
      const mockHandlersWithLoader = {
        handlePage: vi.fn().mockResolvedValue('<html></html>'),
        handleLoader: vi.fn().mockResolvedValue('loader data'),
      }
      const { handler } = createHandleRequest(mockHandlersWithLoader, {
        routerRoot: '/app',
      })

      // /otp is an SSG route with hasLoader: false in the mock manifest above.
      // The client fetches /assets/otp_<nonce>_vxrn_loader.js when navigating
      // client-side to /otp.
      const response = (await handler(
        createRequest('/assets/otp_123_vxrn_loader.js')
      )) as Response | null

      // handleLoader must not be called — the whole point is to avoid
      // importing the page module on the server for no-loader routes.
      expect(mockHandlersWithLoader.handleLoader).not.toHaveBeenCalled()

      expect(response).not.toBeNull()
      expect(response!.status).toBe(200)
      expect(response!.headers.get('Content-Type')).toBe('text/javascript')

      const body = await response!.text()
      expect(body).toContain('export function loader()')
      expect(body).toContain('return undefined')
    })

    it('should still call handleLoader when route has hasLoader: true', async () => {
      const mockHandlersWithLoader = {
        handlePage: vi.fn().mockResolvedValue('<html></html>'),
        handleLoader: vi.fn().mockResolvedValue('export function loader(){return 1}'),
      }
      const { handler } = createHandleRequest(mockHandlersWithLoader, {
        routerRoot: '/app',
      })

      await handler(createRequest('/assets/profile_123_vxrn_loader.js'))

      expect(mockHandlersWithLoader.handleLoader).toHaveBeenCalled()
    })

    it('should still call handleLoader when hasLoader is undefined (dev/back-compat)', async () => {
      // Routes without hasLoader set (e.g. dev mode, older builds) must fall
      // through to the normal handleLoader path — we only short-circuit on an
      // explicit `false`.
      const mockHandlersWithLoader = {
        handlePage: vi.fn().mockResolvedValue('<html></html>'),
        handleLoader: vi.fn().mockResolvedValue('loader data'),
      }
      const { handler } = createHandleRequest(mockHandlersWithLoader, {
        routerRoot: '/app',
      })

      // /my-page matches the [slug] ssr route which has no hasLoader field
      await handler(createRequest('/assets/my-page_123_vxrn_loader.js'))

      expect(mockHandlersWithLoader.handleLoader).toHaveBeenCalled()
    })
  })

  describe('dynamic route matching', () => {
    it('should match dynamic routes for regular paths without extensions', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      await handler(createRequest('/my-page'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })

    it('should match index route', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      await handler(createRequest('/'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })

    it('should match paths with hyphens', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      await handler(createRequest('/my-awesome-page'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })
  })

  describe('special paths', () => {
    it('should skip __vxrnhmr path', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/__vxrnhmr'))
      expect(result).toBeNull()
    })

    it('should skip vite internal paths like /@fs/', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      expect(await handler(createRequest('/@fs/some/path'))).toBeNull()
      expect(await handler(createRequest('/@vite/client'))).toBeNull()
      expect(await handler(createRequest('/@id/__x00__virtual:one-entry'))).toBeNull()
    })

    it('should NOT skip user routes that start with @', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      // routes like /@admin should be matched, not skipped
      await handler(createRequest('/@admin'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })
  })
})
