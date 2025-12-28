/**
 * Local Vercel Functions Server
 *
 * This server simulates Vercel's serverless function runtime locally.
 * It serves static files from .vercel/output/static and handles
 * serverless functions from .vercel/output/functions.
 */

import { createServer } from 'node:http'
import { readFile, stat, readdir } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pathToFileURL } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const VERCEL_OUTPUT = join(__dirname, '.vercel', 'output')
const STATIC_DIR = join(VERCEL_OUTPUT, 'static')
const FUNCTIONS_DIR = join(VERCEL_OUTPUT, 'functions')

const PORT = process.env.PORT || 3456

// Simulate Vercel environment - needed for AsyncLocalStorage workaround
process.env.VERCEL = '1'
process.env.VERCEL_URL = `localhost:${PORT}`
// Required for SSR mode detection in One
process.env.VITE_ENVIRONMENT = 'ssr'

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.map': 'application/json',
}

/**
 * Find a matching function directory for a given path
 */
async function findFunction(pathname) {
  // Normalize pathname
  const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) || '/' : pathname

  // Try exact match first (for API routes)
  const exactPaths = [
    join(FUNCTIONS_DIR, normalizedPath + '.func'),
    join(FUNCTIONS_DIR, normalizedPath, 'index.func'),
  ]

  for (const funcPath of exactPaths) {
    try {
      const stats = await stat(funcPath)
      if (stats.isDirectory()) {
        return funcPath
      }
    } catch {}
  }

  // Try dynamic route matching
  const parts = normalizedPath.split('/').filter(Boolean)
  const candidates = []

  async function scanDir(dir, depth = 0) {
    try {
      const entries = await readdir(dir, { withFileTypes: true })
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const entryName = entry.name

          if (entryName.endsWith('.func')) {
            candidates.push({
              path: join(dir, entryName),
              name: entryName.slice(0, -5),
            })
          } else {
            await scanDir(join(dir, entryName), depth + 1)
          }
        }
      }
    } catch {}
  }

  await scanDir(FUNCTIONS_DIR)

  // Match dynamic routes
  for (const candidate of candidates) {
    const funcPath = candidate.path
      .replace(FUNCTIONS_DIR, '')
      .replace('.func', '')
      .replace(/\\/g, '/')

    // Convert Vercel path params to regex
    // :param -> matches single segment
    // * -> matches rest
    let pattern = funcPath
      .replace(/\[([^\]]+)\]/g, ':$1') // [param] -> :param for internal use
      .replace(/:([^/]+)/g, '([^/]+)') // :param -> regex group
      .replace(/\*/g, '(.+)') // * -> matches rest

    const regex = new RegExp(`^${pattern}$`)
    const match = normalizedPath.match(regex)

    if (match) {
      return funcPath.endsWith('.func') ? funcPath : candidate.path
    }
  }

  return null
}

/**
 * Serve a static file
 */
async function serveStatic(res, pathname) {
  let filePath = join(STATIC_DIR, pathname)

  try {
    let stats = await stat(filePath)

    // If directory, look for index.html
    if (stats.isDirectory()) {
      filePath = join(filePath, 'index.html')
      stats = await stat(filePath)
    }

    const ext = extname(filePath)
    const mimeType = MIME_TYPES[ext] || 'application/octet-stream'

    const content = await readFile(filePath)
    res.writeHead(200, { 'Content-Type': mimeType })
    res.end(content)
    return true
  } catch (err) {
    // Try with .html extension
    try {
      const htmlPath = filePath + '.html'
      await stat(htmlPath)
      const content = await readFile(htmlPath)
      res.writeHead(200, { 'Content-Type': 'text/html' })
      res.end(content)
      return true
    } catch {}

    return false
  }
}

/**
 * Execute a serverless function
 */
async function executeFunction(funcDir, req, res, pathname) {
  try {
    // Read the function config
    const configPath = join(funcDir, '.vc-config.json')
    const config = JSON.parse(await readFile(configPath, 'utf-8'))

    // Import the function entrypoint
    const entrypointPath = join(funcDir, 'entrypoint', 'index.js')
    const entrypointUrl = pathToFileURL(entrypointPath).href
    const funcModule = await import(entrypointUrl)

    // Build the request URL
    const protocol = 'http'
    const host = req.headers.host || `localhost:${PORT}`
    const url = new URL(pathname + (req.url.includes('?') ? '?' + req.url.split('?')[1] : ''), `${protocol}://${host}`)

    // Check if it's an API route (exports GET, POST, etc.) or SSR (exports default handler)
    if (funcModule.default && typeof funcModule.default === 'function') {
      // SSR-style handler (req, res)
      const mockReq = {
        url: url.toString(),
        method: req.method,
        headers: Object.fromEntries(
          Object.entries(req.headers).map(([k, v]) => [k, v])
        ),
      }

      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      if (chunks.length > 0) {
        mockReq.body = Buffer.concat(chunks).toString()
      }

      // Mock response object for SSR handlers
      let statusCode = 200
      const headers = {}

      const mockRes = {
        setHeader: (key, value) => {
          headers[key] = value
        },
        writeHead: (code, hdrs) => {
          statusCode = code
          if (hdrs) Object.assign(headers, hdrs)
        },
        end: (body) => {
          res.writeHead(statusCode, headers)
          res.end(body)
        },
      }

      // Set VERCEL_URL for SSR functions
      process.env.VERCEL_URL = host

      await funcModule.default(mockReq, mockRes)
    } else {
      // API-style handler (Web API Request/Response)
      const method = req.method.toUpperCase()
      const handler = funcModule[method]

      if (!handler) {
        res.writeHead(405, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: `Method ${method} not allowed` }))
        return
      }

      // Extract route params from the func directory path (e.g., "api/echo/:param.func")
      // Vercel adds route params as query params via rewrites
      const funcRelPath = funcDir.replace(FUNCTIONS_DIR + '/', '').replace('.func', '')
      const paramPattern = funcRelPath
        .replace(/\[\.\.\.(\w+)\]/g, '(?<$1>.+)')
        .replace(/\[(\w+)\]/g, '(?<$1>[^/]+)')
        .replace(/:(\w+)/g, '(?<$1>[^/]+)')

      const paramMatch = pathname.match(new RegExp(`^/${paramPattern}$`))
      if (paramMatch?.groups) {
        // Add route params as query params (simulating Vercel's routing)
        for (const [key, value] of Object.entries(paramMatch.groups)) {
          url.searchParams.set(key, value)
        }
      }

      // Build a Web API Request
      const chunks = []
      for await (const chunk of req) {
        chunks.push(chunk)
      }
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined

      const request = new Request(url.toString(), {
        method,
        headers: req.headers,
        body: method !== 'GET' && method !== 'HEAD' ? body : undefined,
      })

      const response = await handler(request)

      if (response instanceof Response) {
        res.writeHead(response.status, Object.fromEntries(response.headers.entries()))
        const responseBody = await response.text()
        res.end(responseBody)
      } else {
        res.writeHead(500, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid response from handler' }))
      }
    }
  } catch (err) {
    console.error('Function execution error:', err)
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message, stack: err.stack }))
  }
}

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url, `http://localhost:${PORT}`).pathname
  console.log(`${req.method} ${pathname}`)

  // Try to find a matching function first
  const funcDir = await findFunction(pathname)

  if (funcDir) {
    await executeFunction(funcDir, req, res, pathname)
    return
  }

  // Try serving static file
  const served = await serveStatic(res, pathname)
  if (served) return

  // 404
  res.writeHead(404, { 'Content-Type': 'text/plain' })
  res.end('Not Found')
})

server.listen(PORT, () => {
  console.log(`Vercel local server running at http://localhost:${PORT}`)
  console.log(`Serving from ${VERCEL_OUTPUT}`)
})
