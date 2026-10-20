import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, expect, it } from 'vitest'
import { BuildWorkerPool } from '../../dist/esm/cli/workerPool.mjs'

let root: string | undefined
let pool: BuildWorkerPool | undefined

afterEach(async () => {
  await pool?.terminate()
  if (root) await rm(root, { recursive: true, force: true })
})

it('keeps serialized loader data in page artifacts and reuses the parent CSS', async () => {
  root = await mkdtemp(join(tmpdir(), 'one-build-worker-'))
  const serverEntry = join(root, 'entry.mjs')
  const clientDir = join(root, 'client')
  const staticDir = join(root, 'static')
  await mkdir(join(clientDir, 'assets'), { recursive: true })
  await mkdir(staticDir)
  await writeFile(
    serverEntry,
    `export default {
      options: { routes: { '/app/probe.tsx': async () => ({
        loader: ({ params }) => ({ toJSON() { return { slug: params.slug } } })
      }) } },
      render: async ({ loaderData }) => '<html><head></head><body>' + JSON.stringify(loaderData) + '</body></html>'
    }`
  )
  pool = new BuildWorkerPool(1)
  await pool.initialize({ web: { inlineLayoutCSS: true } })
  const cssContents = ['body { color: red }']
  for (const slug of ['first', 'second']) {
    const result = await pool.buildPage({
      serverEntry,
      routerRoot: 'app',
      path: `/${slug}`,
      relativeId: '/probe.tsx',
      params: { slug },
      foundRoute: { type: 'ssg', file: './probe.tsx', layouts: [], middlewares: [] },
      clientManifestEntry: { file: 'assets/probe.js' },
      staticDir,
      clientDir,
      builtMiddlewares: {},
      serverJsPath: 'server/probe.js',
      preloads: [],
      allCSS: ['/assets/probe.css'],
      layoutCSS: [],
      routePreloads: [],
      allCSSContents: cssContents,
    })
    expect(result.cssContents).toBe(cssContents)
    expect(result).not.toHaveProperty('loaderData')
    expect(await readFile(join(staticDir, `${slug}.html`), 'utf8')).toContain(
      JSON.stringify({ slug })
    )
    const loaderFile = join(clientDir, result.loaderPath)
    const module = await import(loaderFile)
    expect(module.loader()).toEqual({ slug })
  }
})
