import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const root = resolve(import.meta.dirname)
const site = `${root}/one`
const output = `${root}/evidence/profile`
mkdirSync(output, { recursive: true })
const files = [
  [`${site}/node_modules/one/dist/esm/cli/buildPageWorker.mjs`, source => source
    .replace('const { buildPage, runWithAsyncLocalContext } = await ensureImports();', "globalThis.__oneProfile?.('before-imports'); const { buildPage, runWithAsyncLocalContext } = await ensureImports(); globalThis.__oneProfile?.('after-imports');")
    .replace('try {', "try { globalThis.__oneProfile?.('before-page', { path: msg.args.path });")
    .replace(/parentPort!?\.postMessage\(\{\s*type: ["']done["']/, "globalThis.__oneProfile?.('after-page'); parentPort.postMessage({ type: 'done'")],
  [`${site}/node_modules/one/dist/esm/cli/buildPage.mjs`, source => source
    .replace('function recordTiming(label, ms) {', "function recordTiming(label, ms) { globalThis.__oneProfile?.(label, { ms });")],
]
const originals = files.map(([path]) => [path, readFileSync(path, 'utf8')])
try {
  for (let i = 0; i < files.length; i++) {
    const [path, patch] = files[i]
    const source = originals[i][1]
    const patched = patch(source)
    if (source === patched) throw new Error(`profile patch failed: ${path}`)
    writeFileSync(path, patched)
  }
  const result = spawnSync('/Users/n8/.local/share/mise/installs/node/24.3.0/bin/node', ['node_modules/one/run.mjs', 'build'], {
    cwd: site, timeout: 180000, stdio: 'inherit',
    env: { ...process.env, ONE_PROFILE_DIR: output, ONE_CACHE_KEY: '424242', ONE_SERVER_URL: 'https://onestack.dev', NODE_OPTIONS: `--import=${pathToFileURL(`${root}/profile.mjs`).href}` },
  })
  if (result.error) throw result.error
  process.exitCode = result.status
} finally {
  for (const [path, source] of originals) writeFileSync(path, source)
}
