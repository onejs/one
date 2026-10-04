import { createServer as createHTTPServer } from 'node:http'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createServer } from 'vite'
await import('oxc-parser')
const { configureVXRNCompilerPlugin } = await import('@vxrn/compiler')
const commonJSCompiler = await import('../../../packages/compiler/dist/cjs/index.cjs')
const { one } = await import('one/vite')
const { buildNativeBundle } =
  await import('../../../packages/vxrn/src/utils/createNativeDevEngine')
const { backgroundComputationPlugin } =
  await import('../../../packages/vxrn/src/plugins/backgroundComputationPlugin')

const root = resolve(import.meta.dirname, '..')
const fixtureRoot = resolve(root, 'fixtures/background-computation')
const contrast = process.env.CONTRAST_SOURCE
const proof = contrast
  ? resolve(contrast, 'scripts/debug/one-background-rally-proof.tsx')
  : resolve(fixtureRoot, 'proof.tsx')
const generated = resolve(
  root,
  'node_modules/.one-background-proof',
  contrast ? 'rally' : 'unit'
)
mkdirSync(generated, { recursive: true })
// the installed Debug host expects HMRClient even with a production JS bundle.
writeFileSync(
  resolve(generated, 'entry.ts'),
  `import { createElement } from 'react'; import { AppRegistry } from 'react-native'; import registerCallableModule from 'react-native/Libraries/Core/registerCallableModule'; import HMRClient from 'react-native/Libraries/Utilities/HMRClient'; import Proof from ${JSON.stringify(proof)}; registerCallableModule('HMRClient', HMRClient); AppRegistry.registerComponent('NativeFeatureTests', () => () => createElement(Proof));`
)
const port = Number(process.env.PORT ?? 8098)
process.chdir(root)
configureVXRNCompilerPlugin({ enableReanimated: true, enableNativeWorklets: true })
commonJSCompiler.configureVXRNCompilerPlugin({
  enableReanimated: true,
  enableNativeWorklets: true,
})
one({
  alias: {
    native: {
      react: resolve(root, '../../node_modules/react/index.js'),
      'react-native-worklets': resolve(
        root,
        '../../node_modules/react-native-worklets/src/index.ts'
      ),
      'one/background': resolve(root, '../../packages/one/dist/esm/background.native.js'),
    },
  },
  native: { app: { name: 'NativeFeatureTests' }, bundler: 'vite' },
})
const bundles = new Map<string, string>()
for (const platform of ['ios', 'android'] as const) {
  const bundle = await buildNativeBundle({
    root,
    platform,
    dev: false,
    minify: false,
    entryFile: resolve(generated, 'entry.ts'),
    serverUrl: `http://localhost:${port}`,
  })
  bundles.set(platform, bundle.code)
  writeFileSync(`/tmp/one-background-${platform}.bundle`, bundle.code)
}
const vite = await createServer({
  configFile: false,
  root: fixtureRoot,
  plugins: [
    backgroundComputationPlugin('web'),
    {
      name: 'background-proof-web-entry',
      load(id) {
        if (id === resolve(fixtureRoot, 'web.tsx'))
          return `import { createElement } from 'react'; import { createRoot } from 'react-dom/client'; import Proof from ${JSON.stringify(proof)}; createRoot(document.getElementById('root')).render(createElement(Proof));`
      },
    },
  ],
  server: {
    middlewareMode: true,
    fs: { allow: [resolve(root, '../..'), process.env.CONTRAST_SOURCE ?? root] },
  },
  resolve: {
    alias: {
      ...(contrast ? { '~': resolve(contrast, 'examples/app-home-designer') } : {}),
      'react-native': 'react-native-web',
      react: resolve(root, '../../node_modules/react'),
      'one/background': resolve(root, '../../packages/one/dist/esm/background.mjs'),
    },
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: { exclude: ['one/background'] },
})
const server = createHTTPServer((req, res) => {
  const url = new URL(req.url!, `http://localhost:${port}`)
  if (url.pathname === '/status') {
    res.end('packager-status:running')
    return
  }
  if (url.pathname.endsWith('.bundle')) {
    res.setHeader('content-type', 'application/javascript')
    res.end(bundles.get(url.searchParams.get('platform') ?? 'ios'))
    return
  }
  vite.middlewares(req, res, () => {
    res.statusCode = 404
    res.end('missing')
  })
})
server.listen(port, '0.0.0.0', () =>
  console.log(`background proof ready: http://localhost:${port}`)
)
