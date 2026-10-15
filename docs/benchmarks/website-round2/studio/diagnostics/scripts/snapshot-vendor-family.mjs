import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, copyFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
const root = import.meta.dirname
const arm = process.argv[2]
assert(['control', 'candidate'].includes(arm))
const out = join(root, 'evidence/ssr-vendor-source', arm)
mkdirSync(out, { recursive: true })
const names = ['one','vxrn','create-vxrn','@vxrn/resolve','@vxrn/query-string','@vxrn/use-isomorphic-layout-effect','@vxrn/utils','@vxrn/vite-flow','@vxrn/vite-plugin-metro','@vxrn/url-parse','@vxrn/tslib-lite','@vxrn/vite-native-client','@vxrn/mdx-rust','@vxrn/compiler','@vxrn/color-scheme','@vxrn/vendor','@vxrn/debug']
const hashes = {}
function visit(dir, prefix) {
 for (const e of readdirSync(dir, { withFileTypes: true })) {
  const file = join(dir, e.name), key = `${prefix}/${e.name}`
  if (e.isDirectory()) visit(file, key)
  else if (e.isFile()) hashes[key] = createHash('sha256').update(readFileSync(file)).digest('hex')
 }
}
for (const name of names) {
 const base = join(root, 'one/node_modules', name)
 for (const folder of ['dist', ...(name === '@vxrn/vendor' ? ['react', 'react-dom'] : [])]) {
  if (existsSync(join(base, folder))) visit(join(base, folder), `${name}/${folder}`)
 }
}
for (const file of ['getOptimizeDeps.mjs', 'getOptimizeDeps.mjs.map', 'getOptimizeDeps.native.js', 'getOptimizeDeps.native.js.map']) copyFileSync(join(root, 'one/node_modules/vxrn/dist/config', file), join(out, file))
writeFileSync(join(out, 'runtime-hashes.json'), JSON.stringify(hashes, null, 2))
if (arm === 'candidate') {
 const control = JSON.parse(readFileSync(join(out, '../control/runtime-hashes.json')))
 const changed = [...new Set([...Object.keys(control), ...Object.keys(hashes)])].filter((key) => control[key] !== hashes[key])
 writeFileSync(join(out, '../runtime-diff.json'), JSON.stringify({ changed, files: Object.keys(hashes).length, sourceChange: 'forced vendored React optimizer roots only' }, null, 2))
 assert.deepEqual(changed.sort(), ['vxrn/dist/config/getOptimizeDeps.mjs','vxrn/dist/config/getOptimizeDeps.mjs.map','vxrn/dist/config/getOptimizeDeps.native.js','vxrn/dist/config/getOptimizeDeps.native.js.map'].sort())
 console.log(JSON.stringify({ files: Object.keys(hashes).length, changed }))
}
