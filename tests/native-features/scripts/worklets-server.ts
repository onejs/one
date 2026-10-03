import { resolve } from 'node:path'
import { build } from 'esbuild'

await import('../../../packages/compiler/dist/esm/index.mjs')
const { configureVXRNCompilerPlugin, transformWorklets } =
  await import('../../../packages/compiler/dist/cjs/index.cjs')
const { buildNativeBundle } =
  await import('../../../packages/vxrn/src/utils/createNativeDevEngine')

const root = resolve(import.meta.dirname, '..')
const port = Number(process.env.PORT || 8095)
configureVXRNCompilerPlugin({
  enableReanimated: true,
  enableNativeWorklets: true,
})
const bundles = new Map<string, string>()
const web = await build({
  stdin: {
    contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import Fixture from './fixtures/one-native-gestures'; createRoot(document.getElementById('root')).render(React.createElement(Fixture));`,
    resolveDir: root,
    loader: 'tsx',
  },
  plugins: [
    {
      name: 'one-fixture-worklets',
      setup(builder) {
        builder.onLoad({ filter: /one-native-gestures\.tsx$/ }, async ({ path }) => ({
          contents: (
            await transformWorklets(path, await Bun.file(path).text(), false, {
              projectRoot: root,
            })
          ).code,
          loader: 'tsx',
        }))
      },
    },
  ],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
  alias: { 'react-native': 'react-native-web' },
  resolveExtensions: [
    '.web.tsx',
    '.web.ts',
    '.web.js',
    '.tsx',
    '.ts',
    '.jsx',
    '.js',
    '.json',
  ],
  define: {
    global: 'globalThis',
    __DEV__: 'true',
    'process.env.NODE_ENV': '"development"',
  },
})

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url)
    if (url.pathname === '/status') return new Response('packager-status:running')
    if (url.pathname === '/web.js')
      return new Response(web.outputFiles[0].text, {
        headers: { 'content-type': 'application/javascript' },
      })
    if (url.pathname.endsWith('.bundle')) {
      const platform = url.searchParams.get('platform')
      if (platform !== 'ios' && platform !== 'android')
        return new Response('platform required', { status: 400 })
      if (!bundles.has(platform)) {
        const bundle = await buildNativeBundle({
          root,
          platform,
          dev: true,
          minify: false,
          entryFile: 'fixtures/worklets-entry.ts',
          serverUrl: `http://localhost:${port}`,
        })
        bundles.set(platform, bundle.code)
      }
      return new Response(bundles.get(platform), {
        headers: { 'content-type': 'application/javascript' },
      })
    }
    if (url.pathname === '/')
      return new Response(
        `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><style>html,body,#root{height:100%;margin:0}</style></head><body><div id="root"></div><script src="/web.js"></script></body></html>`,
        { headers: { 'content-type': 'text/html' } }
      )
    return new Response('not found', { status: 404 })
  },
})
console.info(`Worklets fixture ready at http://localhost:${port}`)
