// typechecks every ts/tsx code block in data/docs and data/native against the
// workspace `one` types (packages/one/types, so build one first).
//
//   bun scripts/check-doc-snippets.ts [pageFilter] [--names]
//
// fails on errors that mean an example disagrees with the real api: unknown
// exports or members, wrong props or arguments. unparseable fragments and
// names a fragment leaves undeclared are reported only with --names.
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { basename, join } from 'node:path'

const site = join(import.meta.dirname, '..')
const root = join(site, '../..')
const args = process.argv.slice(2)
const showNames = args.includes('--names')
const filter = args.find((a) => !a.startsWith('--'))
const outDir = join(root, 'tmp/doc-snippets')
const tsc = join(root, 'node_modules/.bin/tsc')

type Snippet = { id: string; page: string; line: number; ext: string; code: string }
type Diagnostic = { id: string; line: number; code: string; message: string }

const snippets: Snippet[] = []
for (const section of ['docs', 'native']) {
  const dir = join(site, 'data', section)
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.mdx'))) {
    const page = `${section}/${basename(file, '.mdx')}`
    if (filter && !page.includes(filter)) continue
    const lines = readFileSync(join(dir, file), 'utf8').split('\n')
    let n = 0
    for (let i = 0; i < lines.length; i++) {
      const open = lines[i].match(/^(\s*)```(tsx|ts|typescript|jsx|js)\b/)
      if (!open) continue
      const indent = open[1].length
      const start = i + 1
      const body: string[] = []
      while (++i < lines.length && !/^\s*```\s*$/.test(lines[i])) {
        body.push(lines[i].slice(Math.min(indent, lines[i].search(/\S|$/))))
      }
      n++
      snippets.push({
        id: `${page.replace('/', '__')}__${n}`,
        page,
        line: start + 1,
        ext: open[2] === 'tsx' || open[2] === 'jsx' ? 'tsx' : 'ts',
        code: body.join('\n'),
      })
    }
  }
}

rmSync(outDir, { recursive: true, force: true })
mkdirSync(outDir, { recursive: true })
// app-local imports in examples (~/features/...) resolve to any
writeFileSync(join(outDir, 'stubs.d.ts'), `declare module '~/*'\n`)

const compilerOptions = {
  target: 'esnext',
  module: 'esnext',
  moduleResolution: 'bundler',
  jsx: 'react-jsx',
  strict: true,
  noEmit: true,
  skipLibCheck: true,
  allowImportingTsExtensions: true,
  resolveJsonModule: true,
  customConditions: ['react-native-legacy-deep-imports'],
  types: ['node'],
  lib: ['esnext', 'dom', 'dom.iterable'],
}

// module augmentation (declare module 'one') leaks across a program, so those
// snippets each get their own project.
const isolated = snippets.filter((s) => /declare (module|global)/.test(s.code))
const shared = snippets.filter((s) => !isolated.includes(s))

function writeProject(dir: string, list: Snippet[]) {
  mkdirSync(join(dir, 'src'), { recursive: true })
  for (const s of list) writeFileSync(join(dir, 'src', `${s.id}.${s.ext}`), `${s.code}\nexport {}\n`)
  writeFileSync(
    join(dir, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions,
      include: ['src', join(outDir, 'stubs.d.ts'), join(root, 'packages/one/env.d.ts')],
    })
  )
}

function check(dir: string): Diagnostic[] {
  let out = ''
  try {
    execFileSync(tsc, ['-p', dir, '--pretty', 'false'], { encoding: 'utf8', maxBuffer: 1 << 28 })
  } catch (e: any) {
    out = String(e.stdout || '')
  }
  const found: Diagnostic[] = []
  for (const l of out.split('\n')) {
    const m = l.match(/src\/([^.]+)\.tsx?\((\d+),\d+\): error (TS\d+): (.*)$/)
    if (m) found.push({ id: m[1], line: +m[2], code: m[3], message: m[4] })
  }
  return found
}

// tsc withholds semantic errors while any file fails to parse, so fragments
// that are not valid modules on their own are set aside and the rest rechecked.
const unparsed = new Set<string>()
const isSyntax = (d: Diagnostic) => /^TS1\d{3}$/.test(d.code) || d.code === 'TS2657'
function checkAll(dir: string, list: Snippet[]) {
  writeProject(dir, list)
  for (;;) {
    const found = check(dir)
    const bad = found.filter(isSyntax).map((d) => d.id)
    if (!bad.length) return found
    for (const id of bad) {
      if (unparsed.has(id)) continue
      unparsed.add(id)
      const s = snippets.find((s) => s.id === id)!
      rmSync(join(dir, 'src', `${id}.${s.ext}`))
    }
  }
}

const diagnostics = [
  ...checkAll(join(outDir, 'shared'), shared),
  ...isolated.flatMap((s) => checkAll(join(outDir, 'isolated', s.id), [s])),
]

// a fragment may leave names undeclared (One, a component, a handler). those,
// implicit anys and examples' own placeholder modules say nothing about One's api.
const undeclared = new Set(['TS2304', 'TS2552', 'TS7006', 'TS7031', 'TS7053', 'TS2451', 'TS2393', 'TS2323', 'TS2440', 'TS2391', 'TS18004', 'TS2664'])
const placeholderModule = /Cannot find module '(\.{1,2}\/|@vercel\/og|better-auth|@hot-updater\/)/
// an undeclared Text or View resolves to the dom class of that name
const domClass = /'(Text|View|Image)' cannot be used as a JSX component|JSX element class does not support attributes/
const isNameOnly = (d: Diagnostic) =>
  undeclared.has(d.code) || placeholderModule.test(d.message) || domClass.test(d.message)

const byId = new Map(snippets.map((s) => [s.id, s]))
const where = (d: Diagnostic) => {
  const s = byId.get(d.id)!
  return `data/${s.page}.mdx:${s.line + d.line - 1}`
}

const failures = diagnostics.filter((d) => !isNameOnly(d))
for (const d of failures) console.log(`${where(d)} ${d.code} ${d.message}`)
if (showNames) {
  for (const d of diagnostics.filter(isNameOnly)) console.log(`(names) ${where(d)} ${d.code} ${d.message}`)
  for (const id of unparsed) {
    const s = byId.get(id)!
    console.log(`(unparsed) data/${s.page}.mdx:${s.line}`)
  }
}
console.log(
  `${snippets.length} snippets, ${unparsed.size} unparsed fragments, ${failures.length} api errors`
)
process.exit(failures.length ? 1 : 0)
