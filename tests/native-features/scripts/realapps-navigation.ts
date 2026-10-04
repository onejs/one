import { existsSync, readFileSync, realpathSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'

const root = resolve(process.argv[2] ?? process.cwd())
const appRequire = createRequire(resolve(root, 'package.json'))
const oneManifest = appRequire.resolve('one/package.json')
const one = JSON.parse(readFileSync(oneManifest, 'utf8'))
const expected = { one: one.version, ...Object.fromEntries(
  Object.entries({ ...one.peerDependencies, ...one.dependencies }).filter(([name]) =>
    name.startsWith('@react-navigation/') || name.startsWith('@vxrn/') || name === 'vxrn'
  )
) }
const workspaces = new Map<string, string>()
for (let dir = root; ; dir = dirname(dir)) {
  const file = join(dir, 'package.json')
  if (existsSync(file)) {
    const manifest = JSON.parse(readFileSync(file, 'utf8'))
    if (manifest.workspaces) {
      const patterns = Array.isArray(manifest.workspaces) ? manifest.workspaces : manifest.workspaces.packages
      for (const pattern of patterns)
        for (const path of new Bun.Glob(`${pattern}/package.json`).scanSync({ cwd: dir, absolute: true })) {
          const workspace = JSON.parse(readFileSync(path, 'utf8'))
          workspaces.set(workspace.name, path)
        }
      break
    }
  }
  if (dirname(dir) === dir) break
}
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
    if (workspaces.has(name)) queue.push(workspaces.get(name)!)
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
    if (name === 'one' && realpathSync(file) !== realpathSync(oneManifest))
      failures.push(`${manifest.name} resolves another One instance at ${file}; native view registration requires one app instance`)
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
