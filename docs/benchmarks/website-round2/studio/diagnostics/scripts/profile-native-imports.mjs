import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const root = import.meta.dirname
const out = join(root, 'evidence/dev-memory-import-attribution')
mkdirSync(out, { recursive: true })
const require = createRequire(join(root, 'one/package.json'))
const samples = []
function record(label) {
  const beforeCollection = process.memoryUsage()
  global.gc()
  const sample = { label, beforeCollection, collected: process.memoryUsage() }
  samples.push(sample)
  writeFileSync(join(out, 'imports.json'), JSON.stringify(samples, null, 2))
  writeFileSync(join(out, `${samples.length}-vmmap.txt`), execFileSync('/usr/bin/vmmap', ['-summary', String(process.pid)], { encoding: 'utf8' }))
  console.log(JSON.stringify(sample))
}
record('node')
for (const module of ['vite', '@vxrn/compiler', '@vxrn/vite-plugin-metro', 'vxrn', 'one/vite']) {
  await import(require.resolve(module))
  record(module)
}
