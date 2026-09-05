import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { describe, expect, test } from 'vitest'

// `/posts/[slug]+ssg.tsx` holds the page body, `/mirror` and `/alt` re-export it.
// that plus `strictExecutionOrder` puts the canonical route in a chunk whose
// exports are renamed, so nothing in the build may read a route's exports off
// its output chunk by name — the server entry's own route map is the only
// resolution the bundler guarantees.

const dist = join(process.cwd(), 'dist')

const buildInfo = JSON.parse(readFileSync(join(dist, 'buildInfo.json'), 'utf-8'))
const routeInfo = (file: string) => buildInfo.routeToBuildInfo[file]

describe('routes that other routes re-export', () => {
  test('the canonical route really does land in a chunk with renamed exports', () => {
    // the precondition every other test here depends on. if rolldown stops
    // renaming, this fixture is no longer exercising the bug and should be
    // rebuilt around whatever does.
    const info = routeInfo('./posts/[slug]+ssg.tsx')
    const chunk = readFileSync(join(process.cwd(), info.serverJsPath), 'utf-8')

    expect(chunk).toMatch(/export \{[^}]*generateStaticParams as \w+/)
    // and never under its own name, which is what makes reading it off the chunk fail
    expect(chunk).not.toMatch(/export \{[^}]*generateStaticParams\s*[,}]/)
  })

  test('every route generates its static params', () => {
    for (const path of [
      '/posts/hello-world',
      '/mirror/hello-world',
      '/alt/another-post',
    ]) {
      expect(Object.keys(buildInfo.routeMap)).toContain(path)
    }
  })

  test('every route bakes its loader data into the static html', () => {
    for (const [url, slug] of [
      ['posts/hello-world', 'hello-world'],
      ['mirror/hello-world', 'hello-world'],
      ['alt/another-post', 'another-post'],
    ]) {
      const html = readFileSync(join(dist, 'client', `${url}.html`), 'utf-8')
      expect(html, url).toContain(`content for ${slug}`)
    }
  })

  test('every route emits a client loader carrying its own data', async () => {
    const assets = readdirSync(join(dist, 'client', 'assets'))

    for (const [prefix, slug] of [
      ['posts_hello-world', 'hello-world'],
      ['mirror_hello-world', 'hello-world'],
      ['alt_another-post', 'another-post'],
    ]) {
      const nativeFile = assets.find(
        (name) => name.startsWith(`${prefix}_`) && name.endsWith('vxrn_loader.native.js')
      )
      expect(nativeFile, prefix).toBeDefined()
      const nativeCode = readFileSync(join(dist, 'client', 'assets', nativeFile!), 'utf-8')
      expect(nativeCode, prefix).toContain(`content for ${slug}`)

      // the browser evaluates this module, so it has to be valid esm with one
      // loader export even when the route re-exports its loader from another
      // route and its chunk holds no stub of its own
      const file = assets.find(
        (name) => name.startsWith(`${prefix}_`) && name.endsWith('vxrn_loader.js')
      )
      expect(file, prefix).toBeDefined()
      const module = await import(pathToFileURL(join(dist, 'client', 'assets', file!)).href)
      expect(module.loader(), prefix).toEqual({ slug, content: `content for ${slug}` })
    }
  })
})

describe('routes whose loader runs per request', () => {
  const serverUrl = () => process.env.ONE_SERVER_URL!

  test('the canonical ssr route also lands in a chunk with renamed exports', () => {
    const info = routeInfo('./ssr/[slug]+ssr.tsx')
    const chunk = readFileSync(join(process.cwd(), info.serverJsPath), 'utf-8')

    expect(chunk).toMatch(/export \{[^}]*loader as \w+/)
    expect(chunk).not.toMatch(/export \{[^}]*\bloader\s*[,}]/)
  })

  test("the loader endpoint returns each route's data", async () => {
    // client-side navigation fetches this, so it is the runtime read of the
    // route module's `loader` export - the html path never needs that read
    // because `useLoader` already holds the real function in the render graph
    const cacheKey = buildInfo.constants.CACHE_KEY

    for (const [path, slug] of [
      ['ssr/hello-world', 'hello-world'],
      ['ssr-mirror/another-post', 'another-post'],
    ]) {
      const url = `${serverUrl()}/assets/${path}_${cacheKey}_vxrn_loader.js`
      const res = await fetch(url)
      expect(res.status, url).toBe(200)

      const code = await res.text()
      expect(code, url).toContain(`ssr content for ${slug}`)
    }
  })

  test('the server renders each route with its loader data', async () => {
    for (const [url, slug] of [
      ['/ssr/hello-world', 'hello-world'],
      ['/ssr-mirror/another-post', 'another-post'],
    ]) {
      const res = await fetch(`${serverUrl()}${url}`)
      expect(res.status, url).toBe(200)

      const html = await res.text()
      expect(html, url).toContain(`ssr content for ${slug}`)
    }
  })
})
