import { spawnSync } from 'node:child_process'
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

export const root = join(import.meta.dir, '..')
const cache = join(root, 'dist', '.npm')

// the published package, unpacked once per version
export function npmPackage(name: string, version: string): string {
  const dir = join(cache, `${name.replace('/', '__')}-${version}`)
  if (existsSync(join(dir, 'package', 'package.json'))) return join(dir, 'package')
  mkdirSync(dir, { recursive: true })
  const pack = spawnSync('npm', ['pack', '--silent', `${name}@${version}`], { cwd: dir, encoding: 'utf8' })
  if (pack.status !== 0) throw new Error(`npm pack ${name}@${version}: ${pack.stderr}`)
  const tgz = join(dir, pack.stdout.trim().split('\n').at(-1)!)
  const untar = spawnSync('tar', ['xzf', tgz, '-C', dir])
  if (untar.status !== 0) throw new Error(`tar ${tgz}: ${untar.stderr}`)
  return join(dir, 'package')
}

// what is left of a file once its types are erased, whitespace normalized; null when it does not parse
export function erase(code: string, loader: 'ts' | 'js'): string | null {
  try {
    return new Bun.Transpiler({ loader, trimUnusedImports: false, deadCodeElimination: false, minifyWhitespace: true }).transformSync(code)
  } catch {
    return null
  }
}

const punct = ['>>>=', '...', '===', '!==', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=', '=>', '==', '!=', '<=', '>=', '&&', '||', '??', '?.', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<', '>>', '**']

// enough of a JavaScript tokenizer for React's published files: joining the tokens gives the text back
export function tokenize(src: string): string[] {
  const toks: string[] = []
  let i = 0
  let prev = ''
  while (i < src.length) {
    const c = src[i]
    let j = i + 1
    if (/\s/.test(c)) {
      while (j < src.length && /\s/.test(src[j])) j++
    } else if (c === '/' && src[i + 1] === '/') {
      while (j < src.length && src[j] !== '\n') j++
    } else if (c === '/' && src[i + 1] === '*') {
      j = src.indexOf('*/', i + 2) + 2
    } else if (c === '"' || c === "'") {
      while (src[j] !== c) j += src[j] === '\\' ? 2 : 1
      j++
    } else if (c === '`') {
      let depth = 0
      while (true) {
        if (src[j] === '\\') { j += 2; continue }
        if (depth === 0 && src[j] === '`') break
        if (src[j] === '$' && src[j + 1] === '{') { depth++; j += 2; continue }
        if (depth > 0 && src[j] === '}') depth--
        j++
      }
      j++
    } else if (/[A-Za-z_$\d]/.test(c)) {
      while (j < src.length && /[\w$.]/.test(src[j]) && !(src[j] === '.' && !/\d/.test(c))) j++
    } else if (c === '/' && (!/[\w$)\]]$/.test(prev) || /^(return|typeof|case|in|of)$/.test(prev))) {
      let cls = false
      while (true) {
        if (src[j] === '\\') { j += 2; continue }
        if (src[j] === '[') cls = true
        else if (src[j] === ']') cls = false
        else if (src[j] === '/' && !cls) break
        j++
      }
      j++
      while (/[a-z]/.test(src[j])) j++
    } else {
      const p = punct.find((p) => src.startsWith(p, i))
      if (p) j = i + p.length
    }
    const t = src.slice(i, j)
    toks.push(t)
    if (t.trim() && !t.startsWith('//') && !t.startsWith('/*')) prev = t
    i = j
  }
  return toks
}

type Part = { clean: string } | { ours: string; base: string; theirs: string }

// git merge-file over three texts, by line or by token
export function merge3(texts: string[], unit: 'line' | 'token'): Part[] {
  const dir = mkdtempSync(join(tmpdir(), 'typed-merge-'))
  const paths = texts.map((t, k) => {
    const p = join(dir, String(k))
    writeFileSync(p, unit === 'line' ? t : tokenize(t).map((t) => JSON.stringify(t)).join('\n') + '\n')
    return p
  })
  const r = spawnSync('git', ['merge-file', '-p', '--diff3', '--diff-algorithm=histogram', ...paths], { encoding: 'utf8', maxBuffer: 1 << 30 })
  const parts: Part[] = []
  let state: 'clean' | 'ours' | 'base' | 'theirs' = 'clean'
  let cur = { ours: '', base: '', theirs: '' }
  let clean = ''
  const lines = r.stdout.split('\n')
  if (unit === 'line' && lines.at(-1) === '') lines.pop()
  for (const line of lines) {
    if (line.startsWith('<<<<<<< ')) { parts.push({ clean }); clean = ''; state = 'ours'; cur = { ours: '', base: '', theirs: '' }; continue }
    if (line.startsWith('||||||| ')) { state = 'base'; continue }
    if (line === '=======' && state === 'base') { state = 'theirs'; continue }
    if (line.startsWith('>>>>>>> ')) { parts.push(cur); state = 'clean'; continue }
    if (unit === 'token' && !line) continue
    const t = unit === 'line' ? line + '\n' : (JSON.parse(line) as string)
    if (state === 'clean') clean += t
    else cur[state] += t
  }
  parts.push({ clean })
  return parts
}
