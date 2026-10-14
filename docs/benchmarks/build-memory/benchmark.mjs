import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { mkdirSync, readFileSync, rmSync, writeFileSync, createWriteStream } from 'node:fs'
import { hostname, cpus, totalmem, platform, release } from 'node:os'
import { resolve, join } from 'node:path'
import { performance } from 'node:perf_hooks'

const [original, candidate, destination] = process.argv.slice(2)
assert(original && candidate && destination, 'expected original, candidate and output directories')
const sites = [{ name: 'control', cwd: resolve(original) }, { name: 'candidate', cwd: resolve(candidate) }]
assert.notEqual(sites[0].cwd, sites[1].cwd)
const output = resolve(destination)
mkdirSync(output, { recursive: true })
const metadata = {
  startedAt: new Date().toISOString(), host: hostname(), platform: platform(), os: release(),
  cpu: cpus()[0].model, cores: cpus().length, ramBytes: totalmem(), node: process.version,
  nodeExecutable: process.execPath, phase: 'build', runs: 3,
  cacheState: 'dist removed; dependencies, compiler and OS caches retained',
  sites: sites.map(site => ({ ...site, versions: Object.fromEntries(
    ['react', 'react-dom', 'tamagui', 'vite', 'one', 'oxc-transform-react'].map(name =>
      [name, JSON.parse(readFileSync(join(site.cwd, 'node_modules', name, 'package.json'))).version])
  ) })),
}
const samples = []
function save() { writeFileSync(join(output, 'build.json'), JSON.stringify({ metadata, samples }, null, 2)) }
function treeRss(pid) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' })
    .trim().split('\n').map(line => line.trim().split(/\s+/).map(Number))
  const ids = new Set([pid])
  let changed = true
  while (changed) {
    changed = false
    for (const [id, parent] of rows) if (ids.has(parent) && !ids.has(id)) { ids.add(id); changed = true }
  }
  return rows.filter(([id]) => ids.has(id)).reduce((sum, row) => sum + row[2] * 1024, 0)
}
for (let run = 0; run < 3; run++) {
  for (const site of run % 2 ? [...sites].reverse() : sites) {
    rmSync(join(site.cwd, 'dist'), { recursive: true, force: true })
    const log = createWriteStream(join(output, `${site.name}-build-${run}.log`))
    const started = performance.now()
    const child = spawn('/usr/bin/time', ['-l', process.execPath, 'node_modules/one/run.mjs', 'build'], {
      cwd: site.cwd, env: { ...process.env, NO_COLOR: '1', ONE_SERVER_URL: 'https://onestack.dev' },
      detached: true, stdio: ['ignore', 'pipe', 'pipe'],
    })
    let text = '', peakTreeRssBytes = 0
    const data = chunk => { text += chunk.toString(); log.write(chunk) }
    child.stdout.on('data', data); child.stderr.on('data', data)
    const sampler = setInterval(() => { peakTreeRssBytes = Math.max(peakTreeRssBytes, treeRss(child.pid)) }, 250)
    let code
    try { [code] = await once(child, 'exit') }
    finally { clearInterval(sampler); log.end() }
    const elapsedMs = performance.now() - started
    assert.equal(code, 0, `${site.name} build failed: ${text.slice(-1800)}`)
    const maxProcessRssBytes = Number(text.match(/(\d+)\s+maximum resident set size/)?.[1])
    assert(maxProcessRssBytes > 0, 'expected macOS time maximum resident set size')
    samples.push({ site: site.name, run, metric: 'build', elapsedMs, maxProcessRssBytes, peakTreeRssBytes })
    save()
  }
}
metadata.finishedAt = new Date().toISOString()
save()
