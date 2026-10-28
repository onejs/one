import FSExtra from 'fs-extra'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { CSS_PRELOAD_JS_POSTFIX, PRELOAD_JS_POSTFIX } from '../constants'
import { dedupePreloadArtifacts, urlPathToFilePath } from './preloadArtifacts'

const roots: string[] = []

async function createClientDir(files: Record<string, string>) {
  const root = await FSExtra.mkdtemp(join(tmpdir(), 'one-preload-dedupe-'))
  roots.push(root)
  const clientDir = join(root, 'client')
  await FSExtra.ensureDir(join(clientDir, 'assets'))
  await Promise.all(
    Object.entries(files).map(([name, content]) =>
      FSExtra.writeFile(join(clientDir, 'assets', name), content)
    )
  )
  return clientDir
}

const paths = (clientDir: string, names: string[]) =>
  Promise.all(
    names.map((name) => FSExtra.readFile(join(clientDir, 'assets', name), 'utf8'))
  )

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => FSExtra.remove(root)))
})

describe('dedupePreloadArtifacts', () => {
  const preload = (route: string) => `/assets/${route}${PRELOAD_JS_POSTFIX}`
  const cssPreload = (route: string) => `/assets/${route}${CSS_PRELOAD_JS_POSTFIX}`
  const file = (urlPath: string) => urlPath.replace('/assets/', '')

  it('points byte-identical preload modules at one canonical file', async () => {
    const files = {
      [file(preload('a'))]: 'register("a")\n',
      [file(preload('b'))]: 'register("a")\n',
      [file(preload('c'))]: 'register("c")\n',
      [file(cssPreload('a'))]: 'export const css = ["a.css"]\n',
      [file(cssPreload('b'))]: 'export const css = ["a.css"]\n',
      [file(cssPreload('c'))]: 'export const css = ["c.css"]\n',
    }
    const clientDir = await createClientDir(files)
    const routes = ['a', 'b', 'c'].map((route) => ({
      preloadPath: preload(route),
      cssPreloadPath: cssPreload(route),
    }))

    expect(await dedupePreloadArtifacts(clientDir, routes)).toBe(2)
    const [aPreload, bPreload, cPreload, aCss, bCss, cCss] = await paths(
      clientDir,
      Object.keys(files)
    )
    expect(aPreload).toBe('register("a")\n')
    expect(bPreload).toBe(`import "${preload('a')}"\n`)
    expect(cPreload).toBe('register("c")\n')
    expect(aCss).toBe('export const css = ["a.css"]\n')
    expect(bCss).toBe(`export * from "${cssPreload('a')}"\n`)
    expect(cCss).toBe('export const css = ["c.css"]\n')
  })

  it('is idempotent and ignores missing route artifacts', async () => {
    const clientDir = await createClientDir({
      [file(preload('a'))]: 'register("a")\n',
      [file(preload('b'))]: 'register("a")\n',
    })
    const routes = ['a', 'b'].map((route) => ({
      preloadPath: preload(route),
      cssPreloadPath: cssPreload(route),
    }))

    expect(await dedupePreloadArtifacts(clientDir, routes)).toBe(1)
    expect(await dedupePreloadArtifacts(clientDir, routes)).toBe(0)
  })

  it('maps route paths to filesystem paths below the client directory', () => {
    expect(urlPathToFilePath('/assets/docs_routing_1_preload.js')).toBe(
      join('assets', 'docs_routing_1_preload.js')
    )
  })
})
