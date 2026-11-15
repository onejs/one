// builds each typed package: npm's package plus its typed files behind the "aot" export condition
// usage: bun typed-packages/scripts/build.ts [--into <node_modules>]
//
// writes dist/<name>. with --into, also lays the typed files and the "aot" exports over
// <node_modules>/<name> when its installed version matches, leaving the rest of the install alone.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
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
  const added: Record<string, string> = {}

  const typed = [...new Bun.Glob('**/*.ts').scanSync(join(root, name, version))]
  for (const rel of typed) {
    const js = rel.replace(/\.ts$/, '.js')
    const code = readFileSync(join(root, name, version, rel), 'utf8')
    if (erase(code, 'ts') !== erase(readFileSync(join(npm, js), 'utf8'), 'js'))
      throw new Error(`${name}@${version} ${rel}: erasing its types does not give npm's ${js}`)
    added[js.replace(/\.js$/, '.aot.ts')] = code
  }

  // a root entry that loads a typed file gets an .aot.ts twin that loads the typed file instead
  const aotEntries = new Set<string>()
  for (const file of readdirSync(npm).filter((f) => f.endsWith('.js'))) {
    let text = readFileSync(join(npm, file), 'utf8')
    for (const rel of typed) {
      const js = './' + rel.replace(/\.ts$/, '.js')
      if (text.includes(`'${js}'`) || text.includes(`"${js}"`)) text = text.replaceAll(js, js.replace(/\.js$/, '.aot.ts'))
    }
    if (text === readFileSync(join(npm, file), 'utf8')) continue
    added[file.replace(/\.js$/, '.aot.ts')] = text
    aotEntries.add('./' + file)
  }
  // a typed file deeper in the package that is itself importable, like react-native's renderer
  const deep = typed.map((rel) => './' + rel.replace(/\.ts$/, '')).filter((p) => !p.includes('/cjs/'))

  const withAot = (pkg: Record<string, any>) => {
    const aotOf = (target: string) => target.replace(/\.js$/, '.aot.ts')
    const wrap = (target: unknown): unknown => {
      if (typeof target === 'string') return aotEntries.has(target) ? { aot: aotOf(target), default: target } : target
      if (!target || typeof target !== 'object' || Array.isArray(target)) return target
      const result: Record<string, unknown> = {}
      for (const [k, v] of Object.entries(target)) {
        if (k === 'aot') return target
        if (k === 'default' && typeof v === 'string' && aotEntries.has(v)) result.aot = aotOf(v)
        result[k] = k === 'default' ? v : wrap(v)
      }
      return result
    }
    // a package without exports stays open to every path once it gets exports
    const exports: Record<string, unknown> = pkg.exports
      ? Object.fromEntries(Object.entries(pkg.exports).map(([k, v]) => [k, wrap(v)]))
      : {
          '.': wrap('./' + (pkg.main ?? 'index.js').replace(/^\.\//, '')),
          ...Object.fromEntries(readdirSync(npm).filter((f) => f.endsWith('.js')).flatMap((f) => [[`./${f.slice(0, -3)}`, wrap(`./${f}`)], [`./${f}`, wrap(`./${f}`)]])),
          './*': './*',
        }
    const deepKeys = Object.fromEntries(deep.flatMap((p) => [[p, { aot: `${p}.aot.ts`, default: `${p}.js` }], [`${p}.js`, { aot: `${p}.aot.ts`, default: `${p}.js` }]]))
    const files = [...(pkg.files ?? []), ...Object.keys(added)].filter((f, k, all) => all.indexOf(f) === k)
    return { ...pkg, exports: { ...deepKeys, ...exports }, ...(pkg.files ? { files } : {}) }
  }

  const out = join(root, 'dist', name)
  rmSync(out, { recursive: true, force: true })
  cpSync(npm, out, { recursive: true })
  for (const [rel, code] of Object.entries(added)) writeFileSync(join(out, rel), code)
  writeFileSync(join(out, 'package.json'), JSON.stringify(withAot(JSON.parse(readFileSync(join(npm, 'package.json'), 'utf8'))), null, 2) + '\n')
  console.log(`${name}@${version}: ${typed.length} typed files, aot entries ${[...aotEntries, ...deep].join(', ')}`)

  if (into) {
    const installed = join(into, name)
    const pkgPath = join(installed, 'package.json')
    const pkg = existsSync(pkgPath) && JSON.parse(readFileSync(pkgPath, 'utf8'))
    if (pkg?.version !== version) {
      console.log(`  ${installed}: ${pkg?.version || 'not installed'}, left alone`)
      continue
    }
    for (const [rel, code] of Object.entries(added)) writeFileSync(join(installed, rel), code)
    writeFileSync(pkgPath, JSON.stringify(withAot(pkg), null, 2) + '\n')
    console.log(`  laid over ${installed}`)
  }
}

// packages that ship their own TypeScript, listed in sources.json, get an aot/ copy of src with each
// .native file in place of its base file and the listed defines inlined, the way their native build does
const sources: Record<string, { define?: Record<string, string> }> = JSON.parse(readFileSync(join(root, 'sources.json'), 'utf8'))
for (const [pattern, { define = {} }] of Object.entries(into ? sources : {})) {
  const names = pattern.endsWith('/*')
    ? existsSync(join(into!, pattern.slice(0, -2))) ? readdirSync(join(into!, pattern.slice(0, -2))).map((n) => `${pattern.slice(0, -2)}/${n}`) : []
    : [pattern]
  let laid = 0
  for (const name of names) {
    const installed = join(into!, name)
    if (!existsSync(join(installed, 'src')) || !existsSync(join(installed, 'package.json'))) continue
    const aot = join(installed, 'aot')
    rmSync(aot, { recursive: true, force: true })
    const files = [...new Bun.Glob('**/*').scanSync(join(installed, 'src'))]
    const nativeBases = new Set(files.filter((f) => /\.native\.[^.]+$/.test(f)).map((f) => f.replace(/\.native(\.[^.]+)$/, '$1')))
    for (const rel of files) {
      const base = rel.replace(/\.native(\.[^.]+)$/, '$1')
      if (base === rel && nativeBases.has(rel)) continue
      let text = readFileSync(join(installed, 'src', rel), 'utf8')
      if (/\.[cm]?[jt]sx?$/.test(rel)) for (const [k, v] of Object.entries(define))
        text = text.replace(new RegExp(k.replace(/[.$]/g, '\\$&') + '(?!\\s*=[^=])', 'g'), v)
      mkdirSync(dirname(join(aot, base)), { recursive: true })
      // src also imports some native files by their full name
      for (const out of new Set([base, rel])) writeFileSync(join(aot, out), text)
    }
    const pkg = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
    const sourceOf = (target: unknown): string | undefined => {
      const rn = typeof target === 'object' && target ? (target as Record<string, unknown>)['react-native'] : undefined
      const file = typeof rn === 'object' && rn ? (rn as Record<string, unknown>).default : rn
      const m = typeof file === 'string' && file.match(/^\.\/dist\/esm\/(.+?)(?:\.native)?\.m?js$/)
      return m ? ['.ts', '.tsx'].map((ext) => `./aot/${m[1]}${ext}`).find((p) => existsSync(join(installed, p))) : undefined
    }
    for (const [key, target] of Object.entries(pkg.exports ?? {})) {
      const source = sourceOf(target)
      if (source && !(target as Record<string, unknown>).aot) pkg.exports[key] = { aot: source, ...(target as object) }
    }
    writeFileSync(join(installed, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
    laid++
  }
  console.log(`${pattern}: aot/ from src laid over ${laid} packages`)
}
