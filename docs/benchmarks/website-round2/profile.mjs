import { appendFileSync, writeFileSync } from 'node:fs'
import { registerHooks } from 'node:module'
import { threadId, isMainThread } from 'node:worker_threads'
import { Session } from 'node:inspector'
import { writeHeapSnapshot } from 'node:v8'

const out = process.env.ONE_PROFILE_DIR
const file = `${out}/${process.pid}-${threadId}.jsonl`
const modules = new Set()
const session = new Session()
const memories = new Set()
const instantiate = WebAssembly.instantiate
WebAssembly.instantiate = async (...args) => {
  const result = await instantiate(...args)
  const instance = result.instance || result
  for (const value of Object.values(instance.exports)) if (value instanceof WebAssembly.Memory) memories.add(value)
  mark('wasm-instantiate', { stack: new Error().stack, exports: Object.keys(instance.exports).slice(0, 12) })
  return result
}
session.connect()
session.post('HeapProfiler.startSampling', { samplingInterval: 65536 })
registerHooks({ load(url, context, nextLoad) {
  modules.add(url)
  return nextLoad(url, context)
} })
let currentPath = ''
let pageCount = 0
function mark(event, extra = {}) {
  appendFileSync(file, JSON.stringify({ at: performance.now(), threadId, event, path: currentPath, wasmMemories: [...memories].map(m => m.buffer.byteLength), ...process.memoryUsage(), ...extra }) + '\n')
}
function allocations(label) {
  session.post('HeapProfiler.getSamplingProfile', {}, (error, result) => {
    if (!error) writeFileSync(`${out}/${process.pid}-${threadId}-${label}-alloc.json`, JSON.stringify(result.profile))
  })
  writeFileSync(`${out}/${process.pid}-${threadId}-${label}-modules.json`, JSON.stringify([...modules]))
}
globalThis.__oneProfile = (event, extra) => {
  if (event === 'before-page') { currentPath = extra.path; pageCount++ }
  mark(event, extra)
  if (event === 'after-page' && (pageCount === 1 || pageCount % 20 === 0)) allocations(`page-${pageCount}`)
  if (process.env.ONE_PROFILE_SNAPSHOT === '1' && threadId === 1 && event === 'after-page' && pageCount === 20) {
    writeHeapSnapshot(`${out}/${process.pid}-${threadId}.heapsnapshot`)
    mark('after-snapshot-gc')
  }
}
const info = console.info
console.info = (...args) => {
  if (isMainThread) mark('log', { text: String(args[0]).slice(0, 220) })
  info(...args)
}
setInterval(() => mark('sample'), 100).unref()
process.on('exit', () => { mark('exit'); allocations('exit') })
mark('preload')
