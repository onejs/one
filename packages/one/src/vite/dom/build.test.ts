import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { runInNewContext } from 'node:vm'
import { createRequire } from 'node:module'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { resolveConfig } from 'vite'
import { expect, it } from 'vitest'
import { useDOMPlugin } from '../plugins/useDomPlugin'
import type { DOMManifest } from './registry'

const require = createRequire(import.meta.url)

it('isolates DOM dependencies in lazy native graphs and joins deterministic browser assets', async () => {
  const { buildNativeBundle } = await import(
    new URL('../../../../vxrn/src/utils/createNativeDevEngine.ts', import.meta.url).href
  )
  const root = await mkdtemp(join(tmpdir(), 'one-dom-build-'))
  const previousPlugins = globalThis.__vxrnAddNativePlugins
  try {
    await mkdir(join(root, 'components'), { recursive: true })
    await writeFile(join(root, 'package.json'), '{"type":"module"}')
    await mkdir(join(root, 'public'))
    await writeFile(join(root, 'public/unrelated.txt'), 'web-only public asset')
    await writeFile(
      join(root, 'entry.ts'),
      `import First from './components/First';
globalThis.first = First;
globalThis.loadLazy = () => import('./lazy-native');`
    )
    await writeFile(
      join(root, 'lazy-native.ts'),
      `import Second from './components/Second';
globalThis.nativeLazyRuns = (globalThis.nativeLazyRuns || 0) + 1;
export default Second;`
    )
    await writeFile(
      join(root, 'native-runtime.ts'),
      'export function createDOMComponent(id) { return id }'
    )
    await writeFile(
      join(root, 'browser-runtime.ts'),
      'export function mountDOMComponent(Component, id) { globalThis.mounted = { element: Component(), id } }'
    )
    await writeFile(
      join(root, 'components/browser.ts'),
      `if (typeof document === 'undefined') throw Error('browser code executed in native'); export const label = 'browser';`
    )
    await writeFile(
      join(root, 'components/deferred.ts'),
      'globalThis.browserLazyRuns = (globalThis.browserLazyRuns || 0) + 1; export default 42'
    )
    await writeFile(join(root, 'components/style.css'), 'body { color: red }')
    await writeFile(
      join(root, 'components/icon.svg'),
      '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>'
    )
    const component = `"use dom";
import { label } from 'browser-alias';
import './style.css';
import icon from './icon.svg';
export type Props = { title: string };
export default function Component() { return <section data-label={label} data-icon={icon} data-load={() => import('./deferred')}>DOM JSX</section> }`
    await writeFile(join(root, 'components/First.tsx'), component)
    await writeFile(join(root, 'components/Second.tsx'), component)
    await symlink('./First.tsx', join(root, 'components/Linked.tsx'))
    const dom = useDOMPlugin({ root, routerRoot: 'app' })
    await resolveConfig(
      {
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [dom],
        define: { 'process.env.NODE_ENV': JSON.stringify('production') },
        // native bundling can inherit an already resolved development config.
        oxc: {
          jsx: {
            runtime: 'automatic',
            importSource: 'custom-jsx',
            development: true,
            refresh: true,
          },
        },
        resolve: {
          alias: {
            'custom-jsx/jsx-runtime': require.resolve('react/jsx-runtime'),
            'custom-jsx/jsx-dev-runtime': require.resolve('react/jsx-dev-runtime'),
            'one/dom/client': join(root, 'browser-runtime.ts'),
            'browser-alias': join(root, 'components/browser.ts'),
          },
        },
      },
      'build',
      'production'
    )
    const registry = dom.api!.registry
    expect(registry.descriptor(join(root, 'components/Linked.tsx')).id).toBe(
      registry.descriptor(join(root, 'components/First.tsx')).id
    )
    const browserImports: string[] = []
    globalThis.__vxrnAddNativePlugins = () => [
      dom,
      {
        name: 'one-dom-native-test-runtime',
        resolveId(source) {
          if (source === 'one/dom/native') return join(root, 'native-runtime.ts')
          if (/browser-alias|\.css$|\.svg$|deferred/.test(source)) {
            browserImports.push(source)
            throw new Error(`browser import reached native resolver: ${source}`)
          }
        },
      },
    ]
    const build = () =>
      buildNativeBundle({
        root,
        platform: 'ios',
        entryFile: 'entry.ts',
        minify: false,
        assetsDest: join(root, 'output'),
      })
    const result = await build()
    const manifestPath = join(root, 'output/one-dom/manifest.json')
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8')) as DOMManifest
    await expect(
      readFile(join(root, 'output/one-dom/unrelated.txt'))
    ).rejects.toMatchObject({ code: 'ENOENT' })
    expect(manifest.protocolVersion).toBe(1)
    expect(manifest.buildId).toMatch(/^[a-f0-9]{64}$/)
    expect(Object.keys(manifest.entries)).toHaveLength(2)
    for (const html of Object.values(manifest.entries)) {
      expect(html).toMatch(/^pages\/dom-[a-f0-9]{32}\/index.html$/)
      // these must already exist when buildNativeBundle returns to packaging.
      const page = await readFile(join(root, 'output/one-dom', html), 'utf8')
      expect(page).toContain('one-dom-root')
      const entry = page.match(/<script[^>]*src="([^"]+)"/)![1]
      // execute emitted ESM with the real production JSX runtime, including a
      // deferred browser import; parsing alone misses calls to missing jsxDEV.
      await promisify(execFile)(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          String.raw`
        import assert from 'node:assert/strict';
        import { pathToFileURL } from 'node:url';
        globalThis.document = { createElement: () => ({ relList: { supports: () => true } }) };
        await import(pathToFileURL(process.argv[1]).href);
        const { element } = globalThis.mounted;
        assert.equal(element.type, 'section');
        assert.equal(element.props['data-label'], 'browser');
        assert.equal(element.props.children, 'DOM JSX');
        assert.match(new URL(element.props['data-icon']).pathname, /\/one-dom\/assets\/icon-.*\.svg$/);
        assert.equal(globalThis.browserLazyRuns, undefined);
        assert.equal((await element.props['data-load']()).default, 42);
        assert.equal(globalThis.browserLazyRuns, 1);
      `,
          join(root, 'output/one-dom', html, '..', entry),
        ],
        {
          env: { ...process.env, NODE_ENV: 'production' },
        }
      )
    }
    const context: any = { console, setTimeout, clearTimeout }
    runInNewContext(result.code, context)
    expect(context.first).toBe(registry.descriptor(join(root, 'components/First.tsx')).id)
    expect(context.nativeLazyRuns).toBeUndefined()
    const lazy = await context.loadLazy()
    expect(context.nativeLazyRuns).toBe(1)
    expect(lazy.default).toBe(registry.descriptor(join(root, 'components/Second.tsx')).id)
    expect(browserImports).toEqual([])
    await build()
    expect(JSON.parse(await readFile(manifestPath, 'utf8'))).toEqual(manifest)
    await writeFile(join(root, 'components/browser.ts'), 'export const label = "changed"')
    await build()
    const changed = JSON.parse(await readFile(manifestPath, 'utf8')) as DOMManifest
    expect(changed.entries).toEqual(manifest.entries)
    expect(changed.buildId).not.toBe(manifest.buildId)
    await writeFile(join(root, 'entry.ts'), 'globalThis.noDOM = true')
    await build()
    await expect(readFile(manifestPath)).rejects.toMatchObject({ code: 'ENOENT' })
  } finally {
    globalThis.__vxrnAddNativePlugins = previousPlugins
    await rm(root, { recursive: true, force: true })
  }
})
