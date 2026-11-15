// lays the types of a typed file onto a newer npm file
// usage: bun typed-packages/scripts/port.ts <name> <from-version> <to-version>
//    or: bun typed-packages/scripts/port.ts <name>@<version>:<typed path> <name>@<version>:<npm path>
//
// the first form ports every typed file of a package to its next version. the second ports one typed
// file onto a file of another package that inlines the same code, like react-native's ReactFabric-prod.js,
// which carries the reconciler in another order and without react-reconciler's `function ($$$config)` wrapper.
//
// works per top-level statement. a statement npm did not change takes its typed text whole, wherever it
// moved. a changed one is merged token by token with the typed statement of the same name and kept only
// if it still erases to npm's new statement; otherwise it is npm's code without types, to type by hand.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { erase, merge3, npmPackage, root, tokenize } from './lib'

const args = process.argv.slice(2)
type Job = { typed: string; oldJs: string; newJs: string; out: string; label: string }
const jobs: Job[] = []
if (args.length === 3) {
  const [name, from, to] = args
  for (const rel of new Bun.Glob('**/*.ts').scanSync(join(root, name, from))) {
    const js = rel.replace(/\.ts$/, '.js')
    jobs.push({ typed: join(root, name, from, rel), oldJs: join(npmPackage(name, from), js), newJs: join(npmPackage(name, to), js), out: join(root, name, to, rel), label: `${name}@${to} ${rel}` })
  }
} else if (args.length === 2) {
  const [from, to] = args.map((a) => {
    const m = a.match(/^(@?[^@]+)@([^:]+):(.+)$/)
    if (!m) throw new Error(`expected <name>@<version>:<path>, got ${a}`)
    return { name: m[1], version: m[2], path: m[3] }
  })
  const out = to.path.replace(/\.js$/, '.ts')
  jobs.push({ typed: join(root, from.name, from.version, from.path), oldJs: join(npmPackage(from.name, from.version), from.path.replace(/\.ts$/, '.js')), newJs: join(npmPackage(to.name, to.version), to.path), out: join(root, to.name, to.version, out), label: `${to.name}@${to.version} ${out}` })
} else throw new Error('usage: port.ts <name> <from-version> <to-version> | port.ts <name>@<version>:<typed path> <name>@<version>:<npm path>')

const brackets = (s: string) => {
  let p = 0, b = 0, c = 0
  for (const t of tokenize(s)) {
    if (t === '(') p++
    else if (t === ')') p--
    else if (t === '[') b++
    else if (t === ']') b--
    else if (t === '{') c++
    else if (t === '}') c--
  }
  return `${p},${b},${c}`
}

// npm's files are prettier output, so a top-level statement starts at column 0 and closing brackets
// at column 0 still belong to the statement above
const statements = (text: string) => text.split(/^(?=[^\s}\])])/m)
const nameOf = (s: string) => s.match(/^(?:async )?function\*? ?([\w$]+)|^(?:var|let|const|class) ([\w$]+)/)?.slice(1).find(Boolean)
const typeOnly = (s: string) => /^(declare |type |interface )/.test(s)

const wrapper = /^module\.exports = function \(\$\$\$config/m
for (const job of jobs) {
  const src = [readFileSync(job.typed, 'utf8'), readFileSync(job.oldJs, 'utf8'), readFileSync(job.newJs, 'utf8')]
  // the reconciler body sits one level deeper inside its wrapper than where other renderers inline it
  if (wrapper.test(src[1]) && !wrapper.test(src[2])) for (const k of [0, 1]) src[k] = src[k].replace(/^ {2}/gm, '')
  const [typed, old, next] = src.map(statements)

  const byCode = new Map<string, string[]>()
  for (const s of typed) if (!typeOnly(s)) byCode.set(erase(s, 'ts')!, [...(byCode.get(erase(s, 'ts')!) ?? []), s])
  const byName = (list: string[]) => {
    const map = new Map<string, string>()
    for (const s of list) if (nameOf(s) && !map.has(nameOf(s)!)) map.set(nameOf(s)!, s)
    return map
  }
  const typedByName = byName(typed.filter((s) => !typeOnly(s)))
  const oldByName = byName(old)

  let same = 0, merged = 0, signed = 0, untyped = 0
  const out = next.map((s) => {
    const code = erase(s, 'js')
    const exact = code !== null && byCode.get(code)?.shift()
    if (exact) return same++, exact
    const name = nameOf(s)
    const ours = name && typedByName.get(name)
    const base = name && oldByName.get(name)
    if (ours && base && ours !== base) {
      let m = ''
      for (const p of merge3([ours, base, s], 'token')) m += 'clean' in p ? p.clean : p.theirs
      if (m !== s && brackets(m) === brackets(s) && erase(m, 'ts') === code) return merged++, m
      // the body changed too much to merge, but its typed signature still fits
      const head = /^(?:async )?function[\s\S]*?\{\n/
      const [oursHead, head2] = [ours.match(head)?.[0], s.match(head)?.[0]]
      if (oursHead && head2 && erase(oursHead + '}', 'ts') === erase(head2 + '}', 'js')) {
        const withHead = oursHead + s.slice(head2.length)
        if (erase(withHead, 'ts') === code) return signed++, withHead
      }
    }
    if (code?.trim()) untyped++
    return s
  })
  // declarations erase to nothing, so they carry over whole
  const decls = typed.filter(typeOnly).join('')
  const text = out.join('').replace(/\n*$/, '\n') + (decls ? '\n' + decls : '')
  if (erase(text, 'ts') !== erase(src[2], 'js')) throw new Error(`${job.label}: the result does not erase to npm's file`)
  mkdirSync(dirname(job.out), { recursive: true })
  writeFileSync(job.out, text)
  console.log(`${job.label}: ${same} statements typed as before, ${merged} changed and re-typed, ${signed} with only their signature typed, ${untyped} left untyped`)
}
