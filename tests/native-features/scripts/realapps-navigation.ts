import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'

const root = resolve(process.argv[2] ?? process.cwd())
const appRequire = createRequire(resolve(root, 'package.json'))
const oneManifest = appRequire.resolve('one/package.json')
const one = JSON.parse(readFileSync(oneManifest, 'utf8'))
const expected = Object.fromEntries(
  Object.entries({ ...one.peerDependencies, ...one.dependencies }).filter(([name]) =>
    name.startsWith('@react-navigation/')
  )
)
const queue = [resolve(root, 'package.json'), oneManifest]
const visited = new Set<string>()
const graph: { name: string; version: string; path: string; expected: unknown }[] = []
const failures: string[] = []
while (queue.length) {
  const parent = queue.shift()!
  if (visited.has(parent)) continue
  visited.add(parent)
  const parentRequire = createRequire(parent)
  const manifest = JSON.parse(readFileSync(parent, 'utf8'))
  for (const name of Object.keys({
    ...manifest.dependencies,
    ...manifest.peerDependencies,
  })) {
    if (!(name in expected)) continue
    let file: string
    try {
      file = parentRequire.resolve(`${name}/package.json`)
    } catch (error) {
      if (manifest.peerDependenciesMeta?.[name]?.optional) continue
      failures.push(`${manifest.name} cannot resolve ${name}: ${String(error)}`)
      continue
    }
    const dependency = JSON.parse(readFileSync(file, 'utf8'))
    graph.push({
      name,
      version: dependency.version,
      path: file,
      expected: expected[name],
    })
    if (dependency.version !== expected[name])
      failures.push(
        `${manifest.name} resolves ${name}@${dependency.version}; One was tested with ${expected[name]}`
      )
    queue.push(file)
  }
}
console.log(
  JSON.stringify(
    {
      one: one.version,
      sourceCommit: one.releaseSourceCommit,
      expected,
      graph,
      failures,
    },
    null,
    2
  )
)
if (failures.length) process.exitCode = 1
