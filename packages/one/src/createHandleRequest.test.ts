import { describe, expect, it, vi, beforeEach } from 'vitest'
import { createHandleRequest } from './createHandleRequest'

// Mock the manifest
vi.mock('./vite/getManifest', () => ({
  getManifest: () => ({
    pageRoutes: [
      {
        file: 'app/[slug].tsx',
        page: '/[slug]',
        namedRegex: '^/(?<nxtPslug>[^/]+?)(?:/)?$',
        routeKeys: { nxtPslug: 'slug' },
        type: 'ssr',
        middlewares: [],
      },
      {
        file: 'app/index.tsx',
        page: '/',
        namedRegex: '^/(?:/)?$',
        routeKeys: {},
        type: 'ssr',
        middlewares: [],
      },
    ],
    apiRoutes: [],
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

    it('should NOT skip extensions longer than 4 chars (routes with dots in names)', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      await handler(createRequest('/route.normal'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })

    it('should NOT skip 5+ char extensions like .woff2', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      await handler(createRequest('/font.woff2'))
      expect(mockHandlers.handlePage).toHaveBeenCalled()
    })

    it('should NOT skip loader paths ending with _vxrn_loader.js', async () => {
      const mockHandlersWithLoader = {
        handlePage: vi.fn().mockResolvedValue('<html></html>'),
        handleLoader: vi.fn().mockResolvedValue('loader data'),
      }
      const { handler } = createHandleRequest(mockHandlersWithLoader, { routerRoot: '/app' })
      // Loader paths are /assets/<path>_<nonce>_vxrn_loader.js - they should reach handleLoader
      // for a matching route (the path /my-page matches the [slug] route)
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

    it('should skip paths starting with /@', async () => {
      const { handler } = createHandleRequest(mockHandlers, { routerRoot: '/app' })
      const result = await handler(createRequest('/@fs/some/path'))
      expect(result).toBeNull()
    })
  })
})
