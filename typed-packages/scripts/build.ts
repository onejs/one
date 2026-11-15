// builds each typed package: npm's package plus its typed files behind the "aot" export condition
// usage: bun typed-packages/scripts/build.ts [--into <node_modules>]
//
// writes dist/<name>. with --into, also lays the typed files and the "aot" exports over
// <node_modules>/<name> when its installed version matches, leaving the rest of the install alone.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { erase, npmPackage, root } from './lib'

const into = process.argv.includes('--into') ? process.argv[process.argv.indexOf('--into') + 1] : null
// installed package dirs given typed files, with those files, for the bridge pass at the end
const laidOver = new Map<string, string[]>()

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
    laidOver.set(installed, Object.keys(added))
    writeFileSync(pkgPath, JSON.stringify(withAot(pkg), null, 2) + '\n')
    console.log(`  laid over ${installed}`)
  }
}

// packages that ship their own TypeScript, listed in sources.json, get an aot/ copy of src resolved for iOS
// (an .ios file over a .native file over the base file) with the listed defines inlined, the way their
// native build does
const sources: Record<string, { define?: Record<string, string> }> = JSON.parse(readFileSync(join(root, 'sources.json'), 'utf8'))
const platforms = ['ios', 'native']
const platformOf = (f: string) => f.match(/\.(ios|native)(\.[^.]+)$/)
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
    const rank = (f: string) => (platformOf(f) ? platforms.indexOf(platformOf(f)![1]) : platforms.length)
    const winner = new Map<string, string>()
    for (const f of files) {
      const base = f.replace(/\.(ios|native)(\.[^.]+)$/, '$2')
      if (!winner.has(base) || rank(f) < rank(winner.get(base)!)) winner.set(base, f)
    }
    for (const rel of files) {
      let text = readFileSync(join(installed, 'src', rel), 'utf8')
      if (/\.[cm]?[jt]sx?$/.test(rel)) for (const [k, v] of Object.entries(define))
        text = text.replace(new RegExp(k.replace(/[.$]/g, '\\$&') + '(?!\\s*=[^=])', 'g'), v)
      mkdirSync(dirname(join(aot, rel)), { recursive: true })
      // every file keeps its own name, since src imports some platform files by it, and the winner also takes the base name
      const base = rel.replace(/\.(ios|native)(\.[^.]+)$/, '$2')
      if (base !== rel || winner.get(base) === rel) writeFileSync(join(aot, rel), text)
      if (base !== rel && winner.get(base) === rel) writeFileSync(join(aot, base), text)
    }
    const pkg = JSON.parse(readFileSync(join(installed, 'package.json'), 'utf8'))
    // the entry's source file: one a condition already points at in src, or the one its native build came from
    const sourceOf = (target: unknown): string | undefined => {
      if (!target || typeof target !== 'object') return
      const values = Object.values(target as Record<string, unknown>).flatMap((v) => (v && typeof v === 'object' ? Object.values(v) : [v]))
      const src = values.find((v): v is string => typeof v === 'string' && /^\.\/src\/.+\.tsx?$/.test(v))
      if (src) return src.replace(/^\.\/src\//, './aot/')
      const rn = (target as Record<string, unknown>)['react-native']
      const file = rn && typeof rn === 'object' ? (rn as Record<string, unknown>).default : rn
      const m = typeof file === 'string' && file.match(/^\.\/dist\/esm\/(.+?)(?:\.native)?\.m?js$/)
      return m ? ['.ts', '.tsx'].map((ext) => `./aot/${m[1]}${ext}`).find((p) => existsSync(join(installed, p))) : undefined
    }
    for (const [key, target] of Object.entries(pkg.exports ?? {})) {
      const source = sourceOf(target)
      if (source && existsSync(join(installed, source)) && !(target as Record<string, unknown>).aot) pkg.exports[key] = { aot: source, ...(target as object) }
    }
    writeFileSync(join(installed, 'package.json'), JSON.stringify(pkg, null, 2) + '\n')
    laidOver.set(installed, [...new Bun.Glob('**/*.{ts,tsx,js,mjs,cjs}').scanSync(aot)].map((f) => `aot/${f}`))
    laid++
  }
  console.log(`${pattern}: aot/ from src laid over ${laid} packages`)
}

// a typed file imports typed packages by name, so bun compiles them with their types too. everything else
// it imports (react, react-native, untyped packages) is read from the host bundle through
// globalThis.__vxrnBridge(id), so the app keeps one copy of each module; each package lists those ids in
// package.json "aotBridge", and ESM imports and JSX reach the global through the typed-packages-bridge package
if (into) {
  const BRIDGE = 'typed-packages-bridge'
  const packageOf = (spec: string) => spec.split('/').slice(0, spec.startsWith('@') ? 2 : 1).join('/')
  const isTyped = (spec: string) => {
    const name = packageOf(spec)
    const pkgPath = join(into, name, 'package.json')
    if (!existsSync(pkgPath)) return false
    const target = JSON.parse(readFileSync(pkgPath, 'utf8')).exports?.['.' + spec.slice(name.length)]
    return !!target && typeof target === 'object' && 'aot' in target
  }
  const bridged = new Set<string>()
  for (const [installed, files] of laidOver) {
    const ids = new Set<string>()
    const bridge = (spec: string) => !/^(\.|\/|node:|bun:|bun$)/.test(spec) && !isTyped(spec) && (ids.add(spec), true)
    for (const rel of files) {
      let text = readFileSync(join(installed, rel), 'utf8')
      text = text.replace(/\brequire\(\s*(["'])([^"'\n]+)\1\s*\)/g, (m, _q, spec) => (bridge(spec) ? `${/\.tsx?$/.test(rel) ? '(globalThis as any)' : 'globalThis'}.__vxrnBridge(${JSON.stringify(spec)})` : m))
      // value imports and re-exports, side-effect imports and dynamic imports; type-only ones stay as they are
      text = text.replace(/(^|[;}\n])(\s*)(import|export)(\s+type\b)?([^;'"]*?\bfrom\s*|\s*)(["'])([^"'\n]+)\6/g, (m, pre, ws, kw, type, mid, q, spec) =>
        type || !(kw === 'import' || /\bfrom\s*$/.test(mid)) || !bridge(spec) ? m : `${pre}${ws}${kw}${mid}${q}${BRIDGE}/${spec}${q}`)
      // a type position `import("x").Name` is left alone
      text = text.replace(/\bimport\(\s*(["'])([^"'\n]+)\1\s*\)(?!\.(?!then\b)[A-Za-z_$])/g, (m, q, spec) => (bridge(spec) ? `import(${q}${BRIDGE}/${spec}${q})` : m))
      if (rel.endsWith('.tsx')) {
        ids.add('react/jsx-runtime')
        if (!text.includes('@jsxImportSource')) text = `/** @jsxImportSource ${BRIDGE}/react */\n` + text
      }
      writeFileSync(join(installed, rel), text)
    }
    const pkgPath = join(installed, 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
    pkg.aotBridge = [...ids].sort()
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
    for (const id of ids) bridged.add(id)
  }
  const out = join(into, BRIDGE)
  rmSync(out, { recursive: true, force: true })
  mkdirSync(out, { recursive: true })
  writeFileSync(join(out, 'package.json'), JSON.stringify({ name: BRIDGE, private: true, exports: { './define': './define.js', './*': './*.js' } }, null, 2) + '\n')
  for (const id of bridged) {
    mkdirSync(dirname(join(out, id)), { recursive: true })
    writeFileSync(join(out, `${id}.js`), `module.exports = globalThis.__vxrnBridge(${JSON.stringify(id)})\n`)
  }
  // for a program that has no host bundle, like the benches: the bridge reads the installed modules
  writeFileSync(join(out, 'define.js'), `var ids = {\n${[...bridged].sort().map((id) => `  ${JSON.stringify(id)}: () => require(${JSON.stringify(id)}),`).join('\n')}\n}\nglobalThis.__vxrnBridge = (id) => ids[id]()\n`)
  console.log(`bridge: ${bridged.size} modules read from the host (${[...bridged].sort().join(', ')})`)
}
