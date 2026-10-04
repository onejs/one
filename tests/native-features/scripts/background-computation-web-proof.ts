import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { build, preview } from 'vite'
import { backgroundComputationPlugin } from '../../../packages/vxrn/src/plugins/backgroundComputationPlugin'

const root = resolve(import.meta.dirname, '..')
const fixtureRoot = resolve(root, 'fixtures/background-computation')
const contrast = process.env.CONTRAST_SOURCE
const production = process.argv.includes('--production')
const artifacts = resolve(process.env.ARTIFACTS ?? '/tmp/one-background-web-proof')
const proof = contrast
  ? resolve(contrast, 'scripts/debug/one-background-rally-proof.tsx')
  : resolve(fixtureRoot, 'proof.tsx')
const outDir = resolve(root, 'node_modules/.one-background-proof/web-production')
mkdirSync(artifacts, { recursive: true })
let server: Awaited<ReturnType<typeof preview>> | undefined
if (production) {
  await build({
    configFile: false,
    root: fixtureRoot,
    plugins: [
      backgroundComputationPlugin('web'),
      {
        name: 'background-proof-entry',
        load(id) {
          if (id === resolve(fixtureRoot, 'web.tsx'))
            return `import { createElement } from 'react'; import { createRoot } from 'react-dom/client'; import Proof from ${JSON.stringify(proof)}; createRoot(document.getElementById('root')).render(createElement(Proof));`
        },
      },
    ],
    worker: { plugins: () => [backgroundComputationPlugin('web')] },
    resolve: {
      alias: {
        ...(contrast ? { '~': resolve(contrast, 'examples/app-home-designer') } : {}),
        'react-native': 'react-native-web',
        react: resolve(root, '../../node_modules/react'),
        'one/background': resolve(root, '../../packages/one/dist/esm/background.mjs'),
      },
      dedupe: ['react', 'react-dom'],
    },
    build: { outDir, emptyOutDir: true },
  })
  server = await preview({
    configFile: false,
    root: fixtureRoot,
    build: { outDir },
    preview: { port: 8107, strictPort: true },
  })
}
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage()
  const errors: string[] = []
  const workers: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  page.on('worker', (worker) => workers.push(worker.url()))
  await page.goto(
    production
      ? 'http://localhost:8107'
      : (process.env.PROOF_URL ?? 'http://localhost:8098')
  )
  const id = contrast ? 'rally-background-status' : 'background-status'
  const expected = contrast
    ? 'passed revision=1 checkpoints=3 legs=3 objects=37'
    : 'latest=3 value=6 runtime=worker error=handled dispose=silent'
  await page.getByTestId(id).filter({ hasText: expected }).waitFor({ timeout: 30_000 })
  if (!contrast)
    await page
      .getByTestId('background-hook')
      .filter({ hasText: 'hook=14 current=true' })
      .waitFor()
  assert.deepEqual(errors, [])
  assert(workers.length > 0, 'calculation must create a worker')
  const mode = `${contrast ? 'rally' : 'contract'}-${production ? 'production' : 'development'}`
  const outcome = {
    mode,
    status: await page.getByTestId(id).innerText(),
    workers,
    errors,
    browser: browser.version(),
    observedAt: new Date().toISOString(),
  }
  writeFileSync(resolve(artifacts, `${mode}.json`), JSON.stringify(outcome, null, 2))
  await page.screenshot({ path: resolve(artifacts, `${mode}.png`) })
  console.log('RAN:', JSON.stringify(outcome))
} finally {
  await browser.close()
  if (server) await new Promise<void>((done) => server!.httpServer.close(() => done()))
}
