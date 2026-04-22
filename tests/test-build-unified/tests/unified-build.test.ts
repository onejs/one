/**
 * Tests for build.server.unified: true
 *
 * What "unified" means:
 *  - api + middleware + server SSR all built in one viteBuild call (single rolldown pass)
 *  - noExternal: true is dropped; rolldown externalizes what it can't bundle
 *  - user-configurable via standard vite ssr.external / rolldownOptions.external
 *  - output file layout (dist/server, dist/api, dist/middlewares) is preserved
 *    so the CF worker lazy-import map and node route dispatch keep working
 *
 * The fixture's vite.config.ts enables unified mode. The setup.ts global
 * build step is what would fail first if the flag is not wired up at all
 * (unknown config key) or is wired up wrong (build fails).
 */

import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const serverUrl = process.env.ONE_SERVER_URL || 'http://localhost:3458'
const distDir = join(process.cwd(), 'dist')

describe('unified build — dist layout', () => {
  it('produces a cloudflare worker bundle', () => {
    expect(existsSync(join(distDir, 'worker', 'index.js'))).toBe(true)
  })

  it('emits server entry at dist/server/_virtual_one-entry.js', () => {
    expect(existsSync(join(distDir, 'server', '_virtual_one-entry.js'))).toBe(true)
  })

  it('emits api routes under dist/api/', () => {
    expect(existsSync(join(distDir, 'api', 'api', 'hello.js'))).toBe(true)
    expect(existsSync(join(distDir, 'api', 'api', 'zod-validate.js'))).toBe(true)
    // axios + date-fmt files also emit — runtime behavior validated separately
    // (see KNOWN-BROKEN note below)
  })

  it('emits dynamic-param api route with brackets replaced', () => {
    // both vite + rolldown-vite transform [param] → _param_ in output filenames
    expect(existsSync(join(distDir, 'api', 'api', 'echo', '_param_.js'))).toBe(true)
  })

  it('emits nested api routes', () => {
    expect(existsSync(join(distDir, 'api', 'api', 'nested', 'ping.js'))).toBe(true)
    expect(existsSync(join(distDir, 'api', 'api', 'nested', '_slug_.js'))).toBe(true)
  })

  it('emits middlewares under dist/middlewares/', () => {
    // root middleware — framework uses _middleware as the bare filename
    const distFiles = readFileSync(join(distDir, 'buildInfo.json'), 'utf-8')
    expect(distFiles).toContain('middlewares')
  })

  it('wrangler output comes from the plugin-generated worker config', () => {
    const config = JSON.parse(
      readFileSync(join(distDir, 'worker', 'wrangler.json'), 'utf-8')
    )
    expect(config.main).toBe('index.js')
    expect(config.no_bundle).toBe(true)
    expect(config.find_additional_modules).toBeUndefined()
    expect(config.assets).toMatchObject({
      directory: '../client',
      binding: 'ASSETS',
      run_worker_first: true,
    })
    expect(config.rules).toEqual([{ type: 'ESModule', globs: ['**/*.js', '**/*.mjs'] }])
  })
})

describe('unified build — runtime behavior', () => {
  it('serves the SSG home page', async () => {
    const res = await fetch(`${serverUrl}/`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('Unified Build Test')
  })

  it('serves the SSR page with loader data', async () => {
    const res = await fetch(`${serverUrl}/ssr-page`)
    expect(res.status).toBe(200)
    const text = await res.text()
    expect(text).toContain('<h1 id="ssr-title">SSR</h1>')
    expect(text).toContain('ssr')
  })

  it('answers baseline api route', async () => {
    const res = await fetch(`${serverUrl}/api/hello`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ hello: 'world' })
  })

  it('answers api HEAD handlers in serve mode', async () => {
    const res = await fetch(`${serverUrl}/api/hello`, {
      method: 'HEAD',
    })
    expect(res.status).toBe(200)
    expect(res.headers.get('x-head-ok')).toBe('true')
  })

  it('answers api OPTIONS handlers in serve mode', async () => {
    const res = await fetch(`${serverUrl}/api/hello`, {
      method: 'OPTIONS',
      headers: {
        Origin: 'https://sootsim.com',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type',
      },
    })
    expect(res.status).toBe(204)
    expect(res.headers.get('access-control-allow-origin')).toBe('https://sootsim.com')
    expect(res.headers.get('access-control-allow-methods')).toContain('OPTIONS')
  })

  it('zod-based api route validates input (pure ESM dep bundles correctly)', async () => {
    const res = await fetch(`${serverUrl}/api/zod-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'alice' }),
    })
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true, name: 'alice' })
  })

  it('zod-based api route rejects invalid input', async () => {
    const res = await fetch(`${serverUrl}/api/zod-validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    expect(res.status).toBe(400)
  })

  it('date-fns + ms bundle and run (CJS/dual-package deps)', async () => {
    const res = await fetch(`${serverUrl}/api/date-fmt`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as { formatted: string; ms: number }
    expect(json.formatted).toBe('2024-06-15')
    expect(json.ms).toBe(3_600_000)
  })

  it('axios can be imported in an api route (node-first CJS + node:http)', async () => {
    const res = await fetch(`${serverUrl}/api/axios-import`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      loaded: boolean
      hasGet: boolean
      hasPost: boolean
    }
    expect(json.loaded).toBe(true)
    expect(json.hasGet).toBe(true)
    expect(json.hasPost).toBe(true)
  })

  it('dynamic-param api route receives params', async () => {
    const res = await fetch(`${serverUrl}/api/echo/hello`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ echo: 'hello' })
  })

  it('nested static api route responds', async () => {
    const res = await fetch(`${serverUrl}/api/nested/ping`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ pong: true })
  })

  it('nested dynamic api route responds with param', async () => {
    const res = await fetch(`${serverUrl}/api/nested/abc123`)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ nested: true, slug: 'abc123' })
  })

  it('api handler receives worker-runtime context (env + executionCtx)', async () => {
    const res = await fetch(`${serverUrl}/api/exec-ctx`)
    expect(res.status).toBe(200)
    const json = (await res.json()) as {
      hasWorker: boolean
      hasEnv: boolean
      hasExecutionCtx: boolean
      hasWaitUntil: boolean
      hasPassThroughOnException: boolean
      hasAssetsBinding: boolean
    }
    expect(json.hasWorker).toBe(true)
    expect(json.hasEnv).toBe(true)
    expect(json.hasExecutionCtx).toBe(true)
    expect(json.hasWaitUntil).toBe(true)
    expect(json.hasPassThroughOnException).toBe(true)
    // ASSETS binding comes from the framework-generated wrangler config
    expect(json.hasAssetsBinding).toBe(true)
  })
})

describe('unified build — middleware chain', () => {
  it('root middleware runs on SSG pages', async () => {
    const res = await fetch(`${serverUrl}/`)
    expect(res.headers.get('X-Root-Middleware')).toBe('root-ran')
  })

  it('root middleware runs on SSR pages', async () => {
    const res = await fetch(`${serverUrl}/ssr-page`)
    expect(res.headers.get('X-Root-Middleware')).toBe('root-ran')
  })

  it('root middleware runs on api routes', async () => {
    const res = await fetch(`${serverUrl}/api/hello`)
    expect(res.headers.get('X-Root-Middleware')).toBe('root-ran')
  })

  it('nested middleware runs on nested routes', async () => {
    const res = await fetch(`${serverUrl}/api/nested/ping`)
    expect(res.headers.get('X-Nested-Middleware')).toBe('nested-ran')
    // root middleware should also still run (chain)
    expect(res.headers.get('X-Root-Middleware')).toBe('root-ran')
  })

  it('nested middleware does NOT run on sibling routes outside nested/', async () => {
    const res = await fetch(`${serverUrl}/api/hello`)
    expect(res.headers.get('X-Nested-Middleware')).toBeNull()
    expect(res.headers.get('X-Root-Middleware')).toBe('root-ran')
  })
})
