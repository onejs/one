import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'

const site = path.resolve(process.argv[2] || 'apps/onestack.dev')
const output = process.argv[3]
const seen = new Set()
const packages = {}

function visit(name, from) {
  const require = createRequire(path.join(from, 'package.json'))
  let manifest
  try {
    manifest = require.resolve(`${name}/package.json`)
  } catch {
    for (const directory of require.resolve.paths(name) || []) {
      const candidate = path.join(directory, name, 'package.json')
      if (fs.existsSync(candidate)) {
        manifest = candidate
        break
      }
    }
  }
  if (!manifest) throw Error(`cannot resolve ${name} from ${from}`)
  manifest = fs.realpathSync(manifest)
  if (seen.has(manifest)) return
  seen.add(manifest)
  const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'))
  ;(packages[name] ||= []).push({ path: manifest, version: pkg.version })
  for (const dependency of Object.keys(pkg.dependencies || {})) {
    if (dependency === 'tamagui' || dependency.startsWith('@tamagui/')) {
      visit(dependency, path.dirname(manifest))
    }
  }
}

const manifest = JSON.parse(fs.readFileSync(path.join(site, 'package.json'), 'utf8'))
for (const name of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
  if (name === 'tamagui' || name.startsWith('@tamagui/')) visit(name, site)
}
for (const name of ['tamagui', '@tamagui/core', '@tamagui/web']) {
  if (packages[name]?.length !== 1) throw Error(`${name} has ${packages[name]?.length} copies`)
}
for (const [name, rows] of Object.entries(packages)) {
  for (const row of rows) {
    if (row.version !== '3.0.0-beta.1479.1') {
      throw Error(`${name} resolves ${row.version} at ${row.path}`)
    }
  }
}
const json = JSON.stringify(packages, null, 2) + '\n'
if (output) fs.writeFileSync(output, json)
else process.stdout.write(json)
