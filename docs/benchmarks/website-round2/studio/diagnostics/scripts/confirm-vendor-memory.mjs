import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, writeFileSync, appendFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { copyFileSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { chromium } from 'playwright'

const root = import.meta.dirname
import { hostname, cpus, totalmem, release } from 'node:os'
const arm = process.argv[2]
assert(['control', 'candidate'].includes(arm))
const run = Number(process.argv[3])
assert(Number.isInteger(run) && run >= 0 && run < 3)
const diagnostic = process.env.ONE_ROUND2_DIAGNOSTIC === '1'
const contextBridge = process.env.ONE_ROUND2_CONTEXT_BRIDGE
const tamaguiSource = process.env.ONE_ROUND2_TAMAGUI_SOURCE
const outputSeries = process.env.ONE_ROUND2_OUTPUT
const out = join(root, `evidence/${outputSeries || (contextBridge ? 'context-bridge/runtime' : diagnostic ? 'ssr-vendor-normal-built-diagnostic' : 'ssr-vendor-confirmation')}/${run}-${arm}`)
const behavior = []
const artifact = join(root, `evidence/ssr-vendor-source/${arm}/getOptimizeDeps.mjs`)
const installed = join(root, 'one/node_modules/vxrn/dist/config/getOptimizeDeps.mjs')
for (const name of ['getOptimizeDeps.mjs', 'getOptimizeDeps.mjs.map', 'getOptimizeDeps.native.js', 'getOptimizeDeps.native.js.map']) copyFileSync(join(root, `evidence/ssr-vendor-source/${arm}`, name), join(root, 'one/node_modules/vxrn/dist/config', name))
assert.equal(createHash('sha256').update(readFileSync(installed)).digest('hex'), createHash('sha256').update(readFileSync(artifact)).digest('hex'))
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
async function hmr(site,page,kind,run){
 const file=join(site.cwd,kind==='component'?site.entry:kind==='shared-component'?'features/site/Footer.tsx':'app/app.css');const original=readFileSync(file,'utf8')
 const needle=kind==='shared-component'?'Copyright 2024 Tamagui, LLC':'Read the docs';const marker=`Benchmark update ${run}`
 const changed=kind!=='css'?original.replace(needle,marker):original+'\nhtml { --benchmark-hmr: "'+marker+'"; }\n'
 assert.notEqual(original,changed)
 await page.evaluate(()=>localStorage.setItem('vxrn-scheme','system'))
 await page.goto(`http://127.0.0.1:${site.port}/`,{waitUntil:'networkidle'})
 await page.getByRole('button',{name:'Toggle theme'}).click();await page.getByRole('button',{name:'Toggle theme'}).click()
 assert.match(await page.locator('html').getAttribute('class'),/t_dark/)
 if(kind==='shared-component')await page.getByText(needle,{exact:true}).scrollIntoViewIfNeeded()
 await page.evaluate(()=>{window.__benchDocumentToken='same-document'})
 const navigation=[];const listener=frame=>{if(frame===page.mainFrame())navigation.push(frame.url())};page.on('framenavigated',listener)
 const started=performance.now()
 try {
  writeFileSync(file,changed)
  if(kind==='component')await page.getByRole('link',{name:marker,exact:true}).waitFor({state:'visible'})
  else if(kind==='shared-component')await page.getByText(marker,{exact:true}).waitFor({state:'visible'})
  else await page.waitForFunction(marker=>getComputedStyle(document.documentElement).getPropertyValue('--benchmark-hmr').includes(marker),marker)
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
  const elapsedMs=performance.now()-started
  const sameDocument=await page.evaluate(()=>window.__benchDocumentToken==='same-document')
  const themeRetained=/t_dark/.test(await page.locator('html').getAttribute('class'))
  assert.equal(sameDocument,true,site.name+' '+kind+' document')
  assert.equal(themeRetained,true,site.name+' '+kind+' theme')
  assert.equal(navigation.length,0,site.name+' '+kind+' reloads')
  behavior.push({site:site.name,run,metric:'hmr',kind,elapsedMs,sameDocument,themeRetained,reloads:navigation.length})
 } finally {
  page.removeListener('framenavigated',listener);writeFileSync(file,original)
  if(kind==='component')await page.getByRole('link',{name:needle,exact:true}).waitFor({state:'visible'})
  else if(kind==='shared-component')await page.getByText(needle,{exact:true}).waitFor({state:'visible'})
  else await page.waitForFunction(()=>getComputedStyle(document.documentElement).getPropertyValue('--benchmark-hmr')==='')
 }
}

try {
  for (const [site, port, debug, args] of [
    ['one', 4431, 9221, ['node_modules/one/run.mjs', 'dev', '--host', '127.0.0.1', '--port', '4431']],
  ]) {
    rmSync(join(root, site, 'node_modules/.vite'), { recursive: true, force: true })
    let log = ''
    let client
    let context
    const spawnedAt = performance.now()
    const server = spawn(process.execPath, [...(diagnostic ? ['--require', join(root, 'trace-react-warnings.cjs')] : []), `--inspect=127.0.0.1:${debug}`, ...args], {
      cwd: join(root, site), env: { ...process.env, PORT: String(port), NO_COLOR: '1', ONE_ROUND2_WARNING_STACK: join(out, 'warning-origin.log') }, detached: true, stdio: ['ignore', 'pipe', 'pipe'],
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
        const sample = { site, phase, elapsedSinceSpawnMs: performance.now() - spawnedAt, ...memory, processes, treeRssBytes: processes.reduce((sum, p) => sum + p.rssBytes, 0) }
        samples.push(sample)
        writeFileSync(join(out, 'memory.json'), JSON.stringify({ host: { name: hostname(), cpus: cpus().length, memory: totalmem(), os: release(), node: process.version }, sourceBaseline: '765bc0073e32b9b37546db7d07af314946fa3ac8', candidate: '8c27d9ac8', contextBridge, tamaguiSource, quietRequested: !diagnostic, diagnostic, arm, run, freshOptimizerCache: true, rawSsrBeforeBrowser: true, behavior, samples }, null, 2))
        console.log(JSON.stringify(sample))
      }
      await record('ready')
      context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, colorScheme: 'light' })
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', (error) => errors.push(error.message))
      const routes = ['/', '/docs/introduction', '/docs/routing', '/docs/configuration', '/native', '/blog/version-two']
      for (const path of routes) {
        const url = `http://127.0.0.1:${port}${path}`
        const requestBegan = performance.now()
        const raw = await fetch(url, { headers: { Accept: 'text/html' } })
        assert.equal(raw.status, 200, `raw SSR status for ${path}`)
        const html = await raw.text()
        const ssrMs = performance.now() - requestBegan
        const visibleBegan = performance.now()
        writeFileSync(join(out, `ssr-${path.replace(/[^a-z0-9]+/gi, '_')}.html`), html)
        const response = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
        assert.equal(response.status(), 200)
        await page.locator('h1').first().waitFor()
        const serverHeading = await page.evaluate((html) => new DOMParser().parseFromString(html, 'text/html').querySelector('h1')?.textContent, html)
        const renderedHeading = await page.locator('h1').first().textContent()
        assert.equal(serverHeading?.replace(/\s+/g, ' ').trim(), renderedHeading?.replace(/\s+/g, ' ').trim(), `SSR heading for ${path}`)
        behavior.push({ path, ssrMs, visibleMs: performance.now() - visibleBegan, heading: renderedHeading })
        if (path === '/') await record('home')
      }
      assert.deepEqual(errors, [])
      if (!contextBridge) assert(!/SSR error while loading|Error rendering .+ on server|Invalid hook call|Using global config fallback/.test(log), 'SSR render failed, see saved server log')
      await record('six-routes')
      await client.gc()
      await record('collected-six-routes')
      for (const kind of ['component', 'shared-component', 'css']) await hmr({ name: site, cwd: join(root, site), entry: 'app/index.tsx', port }, page, kind, run)
      await record('after-hmr')
      assert.deepEqual(errors, [])
      assert(!/SSR error while loading|Error rendering .+ on server|Invalid hook call|Using global config fallback/.test(log), 'server failed after HMR')
      writeFileSync(join(out, `${site}-require-cache.json`), JSON.stringify(await client.evaluate('Object.keys(process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json").cache)'), null, 2))
      writeFileSync(join(out, `${site}-vmmap-collected.txt`), execFileSync('/usr/bin/vmmap', ['-summary', String(server.pid)], {encoding:'utf8'}))
    } finally {
      if (client) writeFileSync(join(out, `${site}-require-cache-final.json`), JSON.stringify(await client.evaluate('Object.keys(process.getBuiltinModule("module").createRequire(process.cwd()+"/package.json").cache)'), null, 2))
      if (context) await context.close()
      if (client) await client.close()
      writeFileSync(join(out, `${site}-server.log`), log)
      if (server.exitCode === null) { process.kill(-server.pid, 'SIGTERM'); await once(server, 'exit') }
    }
  }
} finally { await browser.close() }
