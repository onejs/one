import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { once } from 'node:events'
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, createWriteStream } from 'node:fs'
import { resolve, join } from 'node:path'
import { hostname, cpus, totalmem } from 'node:os'
import { createHash } from 'node:crypto'

const root = resolve(import.meta.dirname)
const node = '/Users/n8/.local/share/mise/installs/node/24.3.0/bin/node'
const counts = (process.env.PAGE_COUNTS || '0,100,500').split(',').map(Number)
const arms = (process.env.BUILD_ARMS || 'one-8,one-4,one-2,one-1,start').split(',')
const runs = Number(process.env.BUILD_RUNS || 3)
const output = join(root, 'evidence', process.env.BUILD_OUTPUT || 'matrix')
mkdirSync(output, { recursive: true })
const metadata = { host: hostname(), cpu: cpus()[0].model, cores: cpus().length, ram: totalmem(), node, runs, arms, counts, started: new Date().toISOString(), cache: 'remove dist; retain compiler, dependency and OS caches', profiles: false }
const samples = []
const artifactBaselines = new Map()
function artifacts(dir) {
  const files = {}
  for (const name of readdirSync(dir, { recursive: true })) {
    if (name === 'version.json' || name.endsWith('/version.json')) continue
    const path = join(dir, name)
    try { files[name] = createHash('sha256').update(readFileSync(path)).digest('hex') }
    catch (error) { if (error.code !== 'EISDIR') throw error }
  }
  return files
}
const docNames = ['configuration', 'introduction', 'routing', 'routing-exports', 'guides-css']
const docs = docNames.map(name => readFileSync(join(root, 'one', 'data/docs', `${name}.mdx`), 'utf8'))
function save() { writeFileSync(join(output, 'build.json'), JSON.stringify({ metadata, samples }, null, 2)) }
function generate(count) {
  for (const name of ['one', 'start']) {
    const dir = join(root, name, 'data/docs')
    for (const file of readdirSync(dir)) if (file.startsWith('round2-generated-')) rmSync(join(dir, file))
    for (let i = 0; i < count; i++) {
      const source = docs[i % docs.length].replace(/^title:.*$/m, `title: Generated documentation ${i + 1}`)
      writeFileSync(join(dir, `round2-generated-${String(i + 1).padStart(3, '0')}.mdx`), source)
    }
  }
}
function treeRss(pid) {
  const rows = execFileSync('ps', ['-axo', 'pid=,ppid=,rss='], { encoding: 'utf8' }).trim().split('\n').map(row => row.trim().split(/\s+/).map(Number))
  const ids = new Set([pid])
  let changed
  do { changed = false; for (const [id, parent] of rows) if (ids.has(parent) && !ids.has(id)) { ids.add(id); changed = true } } while (changed)
  return rows.filter(([id]) => ids.has(id)).reduce((sum, row) => sum + row[2] * 1024, 0)
}
try {
  for (const count of counts) {
    generate(count)
    for (let run = 0; run < runs; run++) {
      for (const arm of run % 2 ? [...arms].reverse() : arms) {
        const name = arm === 'start' ? 'start' : 'one'
        const cwd = join(root, name)
        if (name === 'one') {
          const variant = arm === 'candidate' ? 'candidate' : 'control'
          for (const file of ['workerPool.mjs', 'buildPageWorker.mjs']) {
            writeFileSync(join(cwd, 'node_modules/one/dist/esm/cli', file), readFileSync(join(root, 'evidence', variant, file)))
          }
        }
        rmSync(join(cwd, 'dist'), { recursive: true, force: true })
        const env = { ...process.env, NO_COLOR: '1', ONE_CACHE_KEY: '424242', ONE_SERVER_URL: 'https://onestack.dev', ...(name === 'one' ? { ONE_BUILD_CONCURRENCY: arm.split('-')[1] || '8' } : {}) }
        const args = name === 'one' ? ['node_modules/one/run.mjs', 'build'] : ['node_modules/vite/bin/vite.js', 'build']
        const log = createWriteStream(join(output, `${count}-${arm}-${run}.log`))
        const began = performance.now()
        const child = spawn('/usr/bin/time', ['-l', node, ...args], { cwd, env, stdio: ['ignore', 'pipe', 'pipe'] })
        let text = '', peakTreeRssBytes = 0
        const data = chunk => { text += chunk; log.write(chunk) }
        child.stdout.on('data', data); child.stderr.on('data', data)
        const sampler = setInterval(() => { peakTreeRssBytes = Math.max(peakTreeRssBytes, treeRss(child.pid)) }, 250)
        let code
        try { [code] = await once(child, 'exit') } finally { clearInterval(sampler); log.end() }
        assert.equal(code, 0, `${arm} ${count} failed: ${text.slice(-2400)}`)
        const maxProcessRssBytes = Number(text.match(/(\d+)\s+maximum resident set size/)?.[1])
        assert(maxProcessRssBytes > 0)
        samples.push({ arm, addedPages: count, run, elapsedMs: performance.now() - began, maxProcessRssBytes, peakTreeRssBytes,
          stages: [...text.matchAll(/(?:vite bundle|static routes|Built in)[: ]+([^\n]+)/g)].map(match => match[0]) })
        if (name === 'one') {
          const hashes = artifacts(join(cwd, 'dist'))
          writeFileSync(join(output, `${count}-${arm}-${run}-artifacts.json`), JSON.stringify(hashes))
          if (arm === 'control' && !artifactBaselines.has(count)) artifactBaselines.set(count, hashes)
          const baseline = artifactBaselines.get(count)
          samples.at(-1).artifactDifferences = [...new Set([...Object.keys(baseline), ...Object.keys(hashes)])].filter(path => baseline[path] !== hashes[path])
        }
        save(); console.log(JSON.stringify(samples.at(-1)))
      }
    }
  }
} finally { generate(0); metadata.finished = new Date().toISOString(); save() }
