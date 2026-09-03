import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
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
    for (const path of ['/posts/hello-world', '/mirror/hello-world', '/alt/another-post']) {
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

  test('every route emits a client loader carrying its own data', () => {
    const assets = readdirSync(join(dist, 'client', 'assets'))

    for (const [prefix, slug] of [
      ['posts_hello-world', 'hello-world'],
      ['mirror_hello-world', 'hello-world'],
      ['alt_another-post', 'another-post'],
    ]) {
      const file = assets.find(
        (name) => name.startsWith(`${prefix}_`) && name.endsWith('vxrn_loader.native.js')
      )
      expect(file, prefix).toBeDefined()

      const code = readFileSync(join(dist, 'client', 'assets', file!), 'utf-8')
      expect(code, prefix).toContain(`content for ${slug}`)
    }
  })
})
