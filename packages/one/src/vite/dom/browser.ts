import { mkdir, writeFile, rm, readdir, readFile, stat } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { join, relative } from 'node:path'
import { build, type Plugin, type ResolvedConfig, type UserConfig } from 'vite'
import type { DOMDescriptor, DOMManifest, DOMRegistry } from './registry'

const ENTRY_PREFIX = 'virtual:one-dom-entry/'
const REFRESH_ENTRY = 'virtual:one-dom-refresh'
export const DOM_DEV_PREFIX = '/_one/dom/'

export function domEntrySource(descriptor: DOMDescriptor, development = false): string {
  return `${development ? `import ${JSON.stringify(REFRESH_ENTRY)};\n` : ''}import Component from ${JSON.stringify(descriptor.moduleId)};\nimport { mountDOMComponent } from "one/dom/client";\nmountDOMComponent(Component, ${JSON.stringify(descriptor.id)});\n`
}

export function domEntryPlugin(registry: DOMRegistry, development = () => false): Plugin {
  return {
    name: 'one:dom-browser-entry',
    resolveId: {
      filter: { id: /^\/?virtual:one-dom-(?:entry\/|refresh$)/ },
      handler(source) {
        const id = source.startsWith('/') ? source.slice(1) : source
        if (development() && id === REFRESH_ENTRY) return `\0${id}`
        if (id.startsWith(ENTRY_PREFIX) && registry.get(id.slice(ENTRY_PREFIX.length))) {
          return `\0${id}`
        }
      },
    },
    load: {
      filter: { id: /^\0virtual:one-dom-/ },
      handler(id) {
        if (development() && id === `\0${REFRESH_ENTRY}`) {
          return `import { injectIntoGlobalHook } from '/@react-refresh';
injectIntoGlobalHook(window);
window.$RefreshReg$ = () => {};
window.$RefreshSig$ = () => (type) => type;`
        }
        if (!id.startsWith(`\0${ENTRY_PREFIX}`)) return
        const descriptor = registry.get(id.slice(ENTRY_PREFIX.length + 1))
        if (!descriptor)
          this.error('[one/use-dom] DOM entry is no longer in the native graph')
        return domEntrySource(descriptor, development())
      },
    },
  }
}

export function domHTML(id: string): string {
  return `<!doctype html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body><style>html,body{margin:0}#one-dom-root{display:flow-root;width:100%;min-width:0}</style><div id="one-dom-root"></div><script type="module" src="/${ENTRY_PREFIX}${id}"></script></body></html>`
}

// a fresh browser build receives browser configuration, never the standalone
// native resolver, native defines, or the One router's application entry.
export async function buildDOMAssets(
  entries: DOMDescriptor[],
  registry: DOMRegistry,
  config: ResolvedConfig,
  browserPlugins: Plugin[],
  assetsDest: string,
  assetsInclude?: UserConfig['assetsInclude']
): Promise<DOMManifest> {
  entries = [...entries].sort((a, b) => a.id.localeCompare(b.id))
  const outDir = join(assetsDest, 'one-dom')
  const manifest: DOMManifest = { protocolVersion: 1, buildId: '', entries: {} }
  if (entries.length) {
    const pages = new Map(
      entries.map((entry) => [
        join(registry.root, 'pages', entry.id, 'index.html').replaceAll('\\', '/'),
        entry,
      ])
    )
    const input = Object.fromEntries([...pages].map(([file, entry]) => [entry.id, file]))
    const client = config.environments.client
    await build({
      configFile: false,
      root: registry.root,
      mode: config.mode,
      logLevel: config.logLevel,
      base: './',
      publicDir: false,
      envPrefix: config.envPrefix,
      define: { ...config.define, ...client?.define },
      resolve: { ...config.resolve, ...client?.resolve },
      css: config.css,
      oxc:
        config.oxc === false
          ? false
          : {
              ...config.oxc,
              ...(typeof config.oxc?.jsx === 'object' && {
                // the native config may have been resolved in development;
                // packaged pages must use the production JSX runtime.
                jsx: { ...config.oxc.jsx, development: false, refresh: false },
              }),
            },
      assetsInclude,
      plugins: [
        ...browserPlugins,
        domEntryPlugin(registry),
        {
          name: 'one:dom-html',
          resolveId(id) {
            if (pages.has(id)) return id
          },
          load(id) {
            const entry = pages.get(id)
            if (entry) return domHTML(entry.id)
          },
        },
      ],
      build: {
        outDir,
        emptyOutDir: true,
        copyPublicDir: false,
        assetsInlineLimit: 0,
        cssCodeSplit: true,
        rolldownOptions: {
          input,
          output: {
            format: 'esm',
            entryFileNames: 'assets/[name]-[hash].js',
            chunkFileNames: 'assets/[name]-[hash].js',
            assetFileNames: 'assets/[name]-[hash][extname]',
          },
        },
      },
    })
    for (const [file, entry] of pages) {
      manifest.entries[entry.id] = relative(registry.root, file).replaceAll('\\', '/')
    }
  }
  if (!entries.length) {
    await rm(outDir, { recursive: true, force: true })
    return { ...manifest, buildId: createHash('sha256').update('{}').digest('hex') }
  }
  await mkdir(outDir, { recursive: true })
  const hash = createHash('sha256').update(JSON.stringify(manifest.entries))
  for (const file of (await readdir(outDir, { recursive: true })).sort()) {
    if (file === 'manifest.json') continue
    const path = join(outDir, file)
    if (!(await stat(path)).isFile()) continue
    const bytes = await readFile(path)
    hash
      .update(file.replaceAll('\\', '/'))
      .update('\0')
      .update(String(bytes.length))
      .update('\0')
      .update(bytes)
  }
  manifest.buildId = hash.digest('hex')
  await writeFile(join(outDir, 'manifest.json'), JSON.stringify(manifest, null, 2))
  return manifest
}
