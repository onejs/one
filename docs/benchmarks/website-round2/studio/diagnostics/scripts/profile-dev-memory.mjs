import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { chromium } from 'playwright'

const root = import.meta.dirname
const out = join(root, 'evidence/dev-memory-diagnostic')
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ headless: true, channel: 'chrome' })
const samples = []
function tree(pid) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8' }).trim().split('\n').map((line) => {
    const [, id, parent, rss, command] = line.match(/^\s*(\d+)\s+(\d+)\s+(\d+)\s+(.+)$/)
    return { id: Number(id), parent: Number(parent), rssBytes: Number(rss) * 1024, command }
  })
  const ids = new Set([pid])
  let changed = true
  while (changed) { changed = false; for (const row of rows) if (ids.has(row.parent) && !ids.has(row.id)) { ids.add(row.id); changed = true } }
  return rows.filter((row) => ids.has(row.id))
}
async function inspector(url) {
  const ws = new WebSocket(url)
  await once(ws, 'open')
  let sequence = 0
  const pending = new Map()
  let heapFile
  ws.addEventListener('message', ({ data }) => {
    const message = JSON.parse(data)
    if (message.method === 'HeapProfiler.addHeapSnapshotChunk') appendFileSync(heapFile, message.params.chunk)
    if (!message.id) return
    const request = pending.get(message.id)
    pending.delete(message.id)
    clearTimeout(request.timer)
    if (message.error) request.reject(new Error(JSON.stringify(message.error)))
    else request.resolve(message.result)
  })
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = ++sequence
      const timer = setTimeout(() => reject(new Error(`inspector timeout: ${method}`)), 120000)
      pending.set(id, { resolve, reject, timer })
      ws.send(JSON.stringify({ id, method, params }))
    })
  }
  return {
    async evaluate(expression) {
      const result = await send('Runtime.evaluate', { expression, returnByValue: true })
      assert(!result.exceptionDetails, JSON.stringify(result.exceptionDetails))
      return result.result.value
    },
    async snapshot(path) { heapFile = path; writeFileSync(path, ''); await send('HeapProfiler.takeHeapSnapshot', { reportProgress: false }) },
    async gc() { await send('HeapProfiler.collectGarbage') },
    async close() { ws.close(); await once(ws, 'close') },
  }
}
try {
  for (const [site, port, debug, args] of [
    ['one', 4431, 9221, ['node_modules/one/run.mjs', 'dev', '--host', '127.0.0.1', '--port', '4431']],
    ['start', 4432, 9222, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4432']],
  ]) {
    rmSync(join(root, site, 'node_modules/.vite'), { recursive: true, force: true })
    let log = ''
    let client
    let context
    const server = spawn(process.execPath, [`--inspect=127.0.0.1:${debug}`, ...args], {
      cwd: join(root, site), env: { ...process.env, PORT: String(port), NO_COLOR: '1' }, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    })
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error(log)), 60000)
        const data = (chunk) => { log += chunk; if (/Local:\s+http/.test(log)) { clearTimeout(timer); resolve() } }
        server.stdout.on('data', data); server.stderr.on('data', data)
        server.once('exit', (code) => { clearTimeout(timer); reject(new Error(`server ${code}: ${log}`)) })
      })
      client = await inspector(log.match(/Debugger listening on (ws:\/\/[^\s]+)/)[1])
      async function record(phase) {
        const memory = await client.evaluate('({memory:process.memoryUsage(),v8:process.getBuiltinModule("v8").getHeapStatistics()})')
        const processes = tree(server.pid)
        const sample = { site, phase, ...memory, processes, treeRssBytes: processes.reduce((sum, p) => sum + p.rssBytes, 0) }
        samples.push(sample)
        writeFileSync(join(out, 'memory.json'), JSON.stringify({ quiet: false, diagnostic: true, cleanOptimizerCache: true, samples }, null, 2))
        console.log(JSON.stringify(sample))
      }
      await record('ready')
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      const routes = ['/', '/docs/introduction', '/docs/routing', '/docs/configuration', '/native', '/blog/version-two']
      for (const path of routes) {
        const response = await page.goto(`http://127.0.0.1:${port}${path}`, { waitUntil: 'networkidle', timeout: 60000 })
        assert.equal(response.status(), 200)
        await page.locator('h1').first().waitFor()
        if (path === '/') await record('home')
      }
      assert.deepEqual(errors, [])
      await record('six-routes')
      await client.gc()
      await record('collected-six-routes')
      writeFileSync(join(out, `${site}-require-cache.json`), JSON.stringify(await client.evaluate('Object.keys(process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json").cache)'), null, 2))
      await client.snapshot(join(out, `${site}.heapsnapshot`))
    } finally {
      if (context) await context.close()
      if (client) await client.close()
      writeFileSync(join(out, `${site}-server.log`), log)
      if (server.exitCode === null) { process.kill(-server.pid, 'SIGTERM'); await once(server, 'exit') }
    }
  }
} finally { await browser.close() }
