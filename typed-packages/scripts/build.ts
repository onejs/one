// builds each typed package: npm's package plus its typed files behind the "aot" export condition
// usage: bun typed-packages/scripts/build.ts [--into <node_modules>]
//
// writes dist/<name>. with --into, also replaces <node_modules>/<name> when its installed version matches.
import { cpSync, existsSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { erase, npmPackage, root } from './lib'

const into = process.argv.includes('--into') ? process.argv[process.argv.indexOf('--into') + 1] : null

const packages: [string, string][] = []
for (const entry of readdirSync(root, { withFileTypes: true })) {
  if (!entry.isDirectory() || ['scripts', 'dist', 'bench'].includes(entry.name)) continue
  const names = entry.name.startsWith('@') ? readdirSync(join(root, entry.name)).map((n) => `${entry.name}/${n}`) : [entry.name]
  // the newest version of each; older ones stay only as the source of a port
  for (const name of names) packages.push([name, readdirSync(join(root, name)).sort(Bun.semver.order).at(-1)!])
}

for (const [name, version] of packages) {
  const npm = npmPackage(name, version)
  const out = join(root, 'dist', name)
  rmSync(out, { recursive: true, force: true })
  cpSync(npm, out, { recursive: true })

  const typed = [...new Bun.Glob('**/*.ts').scanSync(join(root, name, version))]
  for (const rel of typed) {
    const js = rel.replace(/\.ts$/, '.js')
    const code = readFileSync(join(root, name, version, rel), 'utf8')
    if (erase(code, 'ts') !== erase(readFileSync(join(npm, js), 'utf8'), 'js'))
      throw new Error(`${name}@${version} ${rel}: erasing its types does not give npm's ${js}`)
    writeFileSync(join(out, js.replace(/\.js$/, '.aot.ts')), code)
  }

  // an entry that loads a typed file gets an .aot.ts twin that loads the typed file instead
  const aotEntries = new Set<string>()
  for (const file of readdirSync(npm).filter((f) => f.endsWith('.js'))) {
    let text = readFileSync(join(npm, file), 'utf8')
    let changed = false
    for (const rel of typed) {
      const js = './' + rel.replace(/\.ts$/, '.js')
      if (text.includes(`'${js}'`) || text.includes(`"${js}"`)) {
        text = text.replaceAll(js, js.replace(/\.js$/, '.aot.ts'))
        changed = true
      }
    }
    if (!changed) continue
    writeFileSync(join(out, file.replace(/\.js$/, '.aot.ts')), text)
    aotEntries.add('./' + file)
  }

  const pkg = JSON.parse(readFileSync(join(npm, 'package.json'), 'utf8'))
  const withAot = (target: unknown): unknown => {
    if (typeof target === 'string') return aotEntries.has(target) ? { aot: target.replace(/\.js$/, '.aot.ts'), default: target } : target
    if (!target || typeof target !== 'object') return target
    const conditions = target as Record<string, unknown>
    const result: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(conditions)) {
      if (k === 'default' && typeof v === 'string' && aotEntries.has(v)) {
        result.aot = v.replace(/\.js$/, '.aot.ts')
        result[k] = v
      } else result[k] = withAot(v)
    }
    return result
  }
  if (pkg.exports) pkg.exports = Object.fromEntries(Object.entries(pkg.exports).map(([k, v]) => [k, withAot(v)]))
  else pkg.exports = { '.': withAot('./' + (pkg.main ?? 'index.js').replace(/^\.\//, '')), './package.json': './package.json' }
  pkg.files = [...(pkg.files ?? []), ...[...aotEntries].map((e) => e.slice(2).replace(/\.js$/, '.aot.ts'))]
  writeFileSync(join(out, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
  console.log(`${name}@${version}: ${typed.length} typed files, aot entries ${[...aotEntries].join(', ')}`)

  if (into) {
    const installed = join(into, name)
    const installedVersion = existsSync(join(installed, 'package.json')) && JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8')).version
    if (installedVersion !== version) {
      console.log(`  ${installed}: ${installedVersion || 'not installed'}, left alone`)
      continue
    }
    rmSync(installed, { recursive: true, force: true })
    cpSync(out, installed, { recursive: true })
    console.log(`  replaced ${installed}`)
  }
}
