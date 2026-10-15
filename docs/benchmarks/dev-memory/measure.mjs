import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve, join } from 'node:path'
import { hostname, cpus, totalmem } from 'node:os'
import { chromium } from 'playwright'

const [control, candidate, destination, mode = 'profile'] = process.argv.slice(2)
const output = resolve(destination)
mkdirSync(output, { recursive: true })
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const metadata = {
  mode,
  startedAt: new Date().toISOString(),
  node: process.version,
  host: hostname(),
  cpu: cpus()[0].model,
  ramBytes: totalmem(),
  browser: browser.version(),
  cache: 'warm disk caches; fresh server and fresh browser context for each run',
  order: [],
}
const samples = []
function save() {
  writeFileSync(
    join(output, 'measure.json'),
    JSON.stringify({ metadata, samples }, null, 2)
  )
}
function tree(pid) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss=,comm='], { encoding: 'utf8' })
    .trim()
    .split('\n')
    .map((line) => {
      const [id, parent, rss, ...comm] = line.trim().split(/\s+/)
      return { pid: +id, ppid: +parent, rssBytes: +rss * 1024, comm: comm.join(' ') }
    })
  const ids = new Set([pid])
  let added = true
  while (added) {
    added = false
    for (const row of rows)
      if (ids.has(row.ppid) && !ids.has(row.pid)) {
        ids.add(row.pid)
        added = true
      }
  }
  const processes = rows.filter((row) => ids.has(row.pid))
  return { processes, treeRssBytes: processes.reduce((s, r) => s + r.rssBytes, 0) }
}
async function connect(url) {
  const ws = new WebSocket(url)
  await once(ws, 'open')
  let id = 0
  const pending = new Map()
  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data)
    if (msg.id) {
      const entry = pending.get(msg.id)
      pending.delete(msg.id)
      msg.error
        ? entry.reject(new Error(JSON.stringify(msg.error)))
        : entry.resolve(msg.result)
    }
  })
  return {
    ws,
    send(method, params = {}) {
      return new Promise((resolve, reject) => {
        const key = ++id
        pending.set(key, { resolve, reject })
        ws.send(JSON.stringify({ id: key, method, params }))
      })
    },
  }
}
async function run(site, run) {
  const cwd = resolve(site.cwd),
    began = performance.now()
  const child = spawn(
    process.execPath,
    [
      '--inspect-brk=127.0.0.1:0',
      'node_modules/one/run.mjs',
      'dev',
      '--host',
      '127.0.0.1',
      '--port',
      '4431',
    ],
    {
      cwd,
      env: {
        ...process.env,
        NO_COLOR: '1',
        ONE_SERVER_URL: 'http://127.0.0.1:4431',
        ONE_PORT: '4431',
      },
      detached: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    }
  )
  let logs = '',
    inspector,
    session,
    readyResolve,
    failedReject,
    inspectorResolve
  const inspectorReady = new Promise((res) => {
    inspectorResolve = res
  })
  const ready = new Promise((res, rej) => {
    readyResolve = res
    failedReject = rej
  })
  const timer = setTimeout(() => failedReject(new Error('readiness timeout')), 60000)
  const data = (chunk) => {
    logs += chunk
    writeFileSync(join(output, `${site.name}-${run}.log`), logs)
    const url = logs.match(/ws:\/\/127\.0\.0\.1:\d+\/[^\s]+/)?.[0]
    if (url && !inspector) {
      inspector = connect(url)
      inspectorResolve(inspector)
    }
    if (/Local:\s+http/.test(logs)) {
      clearTimeout(timer)
      readyResolve(performance.now() - began)
    }
  }
  child.stdout.on('data', data)
  child.stderr.on('data', data)
  child.once('exit', (code) => failedReject(new Error(`server exited ${code}`)))
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    deviceScaleFactor: 1,
    colorScheme: 'light',
    extraHTTPHeaders: { 'Accept-Encoding': 'identity' },
  })
  const page = await context.newPage(),
    cdp = await context.newCDPSession(page)
  const errors = [],
    requests = []
  page.on('pageerror', (e) => errors.push(e.message))
  page.on('request', (r) => requests.push(r.url()))
  const getNode = async () =>
    (
      await session.send('Runtime.evaluate', {
        expression:
          'JSON.stringify({memory:process.memoryUsage(),stackLimit:Error.stackTraceLimit===Infinity?"Infinity":Error.stackTraceLimit,sourceMapsEnabled:process.sourceMapsEnabled,uptime:process.uptime()})',
        returnByValue: true,
      })
    ).result.value
  async function stage(name, pageInfo = {}) {
    const node = JSON.parse(await getNode())
    const processes = tree(child.pid)
    const entry = {
      site: site.name,
      run,
      stage: name,
      elapsedSinceSpawnMs: performance.now() - began,
      ...node,
      ...processes,
      ...pageInfo,
    }
    if (mode === 'profile') {
      await session.send('HeapProfiler.collectGarbage')
      entry.afterGc = JSON.parse(await getNode())
    }
    samples.push(entry)
    save()
    console.log(
      JSON.stringify({
        site: site.name,
        run,
        stage: name,
        rssMiB: node.memory.rss / 2 ** 20,
        heapMiB: node.memory.heapUsed / 2 ** 20,
        retainedMiB: entry.afterGc?.memory.heapUsed / 2 ** 20,
      })
    )
  }
  async function load(path) {
    const started = performance.now(),
      response = await page.goto('http://127.0.0.1:4431' + path, {
        waitUntil: 'load',
        timeout: 90000,
      })
    assert.equal(response.status(), 200)
    await page.locator('h1').first().waitFor({ state: 'visible' })
    await page.evaluate(() => document.fonts.ready)
    const visibleMs = performance.now() - started
    await page.waitForLoadState('networkidle')
    await page.evaluate(
      () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
    )
    const heading = await page.locator('h1').first().textContent()
    await cdp.send('HeapProfiler.collectGarbage')
    const browserHeap = await cdp.send('Runtime.getHeapUsage')
    await new Promise((res) => setTimeout(res, 2000))
    return { path, visibleMs, heading, browserHeap }
  }
  try {
    session = await inspectorReady
    if (mode === 'profile')
      await session.send('HeapProfiler.startSampling', { samplingInterval: 32768 })
    await session.send('Runtime.runIfWaitingForDebugger')
    const readyMs = await ready
    await new Promise((res) => setTimeout(res, 3000))
    await stage('ready', { readyMs })
    await stage('home-first', await load('/'))
    await stage('home-repeat', await load('/'))
    await stage('introduction-first', await load('/docs/introduction'))
    await stage('configuration-first', await load('/docs/configuration'))
    await stage('configuration-repeat', await load('/docs/configuration'))
    await session.send('HeapProfiler.collectGarbage')
    await stage('retained-end')
    if (mode !== 'profile') {
      const response = await context.request.get(
        'http://127.0.0.1:4431/memory-source-map'
      )
      assert.equal(response.status(), 200)
      const mappedStack = await response.text()
      writeFileSync(join(output, `${site.name}-${run}-mapped-stack.txt`), mappedStack)
      assert.match(mappedStack, /memory-source-map\+api\.ts:4:\d+/)
    }
    assert.deepEqual(errors, [])
    const rnRequests = requests.filter((url) =>
      /\/(?:react-native|react-native-web|react-native-web-lite)(?:[/.?]|$)|\/(?:@tamagui\/react-native-web(?:-lite)?\/|@tamagui_react-native-web(?:-lite)?\.js)/.test(
        url
      )
    )
    writeFileSync(
      join(output, `${site.name}-${run}-requests.json`),
      JSON.stringify({ requests, rnRequests }, null, 2)
    )
    assert.deepEqual(rnRequests, [])
    if (mode === 'profile') {
      const p = await session.send('HeapProfiler.stopSampling')
      writeFileSync(join(output, 'allocation-profile.json'), JSON.stringify(p))
    }
  } finally {
    clearTimeout(timer)
    await context.close()
    session?.ws.close()
    if (child.exitCode === null) {
      const done = once(child, 'exit')
      process.kill(-child.pid, 'SIGTERM')
      await done
    }
  }
}
try {
  const sites = [
    { name: 'control', cwd: control },
    { name: 'candidate', cwd: candidate },
  ]
  for (let n = 0; n < (mode === 'profile' || mode === 'warmup' ? 1 : 3); n++)
    for (const site of mode === 'profile'
      ? [sites[0]]
      : n % 2
        ? [...sites].reverse()
        : sites) {
      metadata.order.push({ site: site.name, run: n })
      await run(site, n)
    }
} finally {
  await browser.close()
  metadata.finishedAt = new Date().toISOString()
  save()
}
