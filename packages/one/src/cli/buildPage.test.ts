import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import {
  LOADER_JS_POSTFIX,
  NATIVE_LOADER_JS_POSTFIX_UNCACHED,
} from '../constants'
import { buildPage } from './buildPage'

let root: string | undefined

afterEach(async () => {
  if (root) await rm(root, { recursive: true, force: true })
})

async function fixture() {
  root = await mkdtemp(join(tmpdir(), 'one-build-page-'))
  const serverEntry = join(root, 'entry.mjs')
  const { writeFile, mkdir } = await import('node:fs/promises')
  await writeFile(
    serverEntry,
    `export default {
      options: { routes: {
        '/app/probe.tsx': async () => ({
          loader: ({ params }) => ({ slug: params.slug }),
        }),
        '/app/gated.tsx': async () => ({
          loader: () => { throw Response.redirect('http://example.com/login', 302) },
        }),
      } },
      render: async ({ loaderData }) => '<html><head></head><body>' + JSON.stringify(loaderData) + '</body></html>'
    }`
  )
  return serverEntry
}

async function buildRoute(
  serverEntry: string,
  out: string,
  route: { path: string; file: string; params: any },
  skipNativeLoaders?: boolean
) {
  const clientDir = join(out, 'client')
  const staticDir = join(out, 'static')
  const { mkdir } = await import('node:fs/promises')
  await mkdir(join(clientDir, 'assets'), { recursive: true })
  await mkdir(staticDir, { recursive: true })
  const built = await buildPage(
    serverEntry,
    'app',
    route.path,
    '/probe.tsx',
    route.params,
    { type: 'ssg', file: route.file, layouts: [], middlewares: [] } as any,
    { file: 'assets/probe.js' },
    staticDir,
    clientDir,
    {},
    'server/probe.js',
    [],
    [],
    [],
    [],
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    skipNativeLoaders
  )
  return { built, clientDir, staticDir }
}

function nativeTwins(clientDir: string, loaderPath: string) {
  const cached = join(clientDir, loaderPath.replace(/\.js$/, '.native.js'))
  const uncached = join(
    clientDir,
    loaderPath.replace(LOADER_JS_POSTFIX, NATIVE_LOADER_JS_POSTFIX_UNCACHED)
  )
  return { cached, uncached }
}

async function exists(path: string) {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

it('omits native loader twins when skipped, keeping web output identical', async () => {
  const serverEntry = await fixture()
  for (const route of [
    { path: '/probe', file: './probe.tsx', params: { slug: 'probe' } },
    { path: '/gated', file: './gated.tsx', params: {} },
  ]) {
    const enabled = await buildRoute(serverEntry, join(root!, 'enabled', route.path), route)
    const skipped = await buildRoute(
      serverEntry,
      join(root!, 'skipped', route.path),
      route,
      true
    )

    // web loader and html are byte-identical either way
    const [enabledLoader, skippedLoader] = await Promise.all([
      readFile(join(enabled.clientDir, enabled.built.loaderPath), 'utf8'),
      readFile(join(skipped.clientDir, skipped.built.loaderPath), 'utf8'),
    ])
    expect(skippedLoader, route.path).toBe(enabledLoader)
    const [enabledHtml, skippedHtml] = await Promise.all([
      readFile(join(enabled.staticDir, `${route.path.slice(1)}.html`), 'utf8'),
      readFile(join(skipped.staticDir, `${route.path.slice(1)}.html`), 'utf8'),
    ])
    expect(skippedHtml, route.path).toBe(enabledHtml)

    // native twins exist by default, absent when skipped
    const enabledTwins = nativeTwins(enabled.clientDir, enabled.built.loaderPath)
    expect(await exists(enabledTwins.cached), `${route.path} cached`).toBe(true)
    expect(await exists(enabledTwins.uncached), `${route.path} uncached`).toBe(true)
    const skippedTwins = nativeTwins(skipped.clientDir, skipped.built.loaderPath)
    expect(await exists(skippedTwins.cached), `${route.path} cached`).toBe(false)
    expect(await exists(skippedTwins.uncached), `${route.path} uncached`).toBe(false)
  }

  // the redirect loader still carries its signal on the web file
  const skipped = await buildRoute(
    serverEntry,
    join(root!, 'redirect'),
    { path: '/gated', file: './gated.tsx', params: {} },
    true
  )
  const webLoader = await readFile(
    join(skipped.clientDir, skipped.built.loaderPath),
    'utf8'
  )
  expect(webLoader).toContain('__oneRedirect')
})

it('writes native loader twins by default', async () => {
  const serverEntry = await fixture()
  const { built, clientDir } = await buildRoute(
    serverEntry,
    join(root!, 'default'),
    { path: '/probe', file: './probe.tsx', params: { slug: 'probe' } }
  )
  const twins = nativeTwins(clientDir, built.loaderPath)
  expect(await exists(twins.cached)).toBe(true)
  expect(await exists(twins.uncached)).toBe(true)
})
