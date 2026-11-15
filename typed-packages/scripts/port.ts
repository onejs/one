// lays the types of one version's typed files onto another version's npm files
// usage: bun typed-packages/scripts/port.ts <name> <from-version> <to-version>
//
// lines npm did not change keep their types. where npm changed a line the types are merged token by
// token, and a region is kept only if the whole file still erases to the new npm file; otherwise it
// is npm's new code without types, to type by hand.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { erase, merge3, npmPackage, root, tokenize } from './lib'

const [name, from, to] = process.argv.slice(2)
if (!name || !from || !to) throw new Error('usage: port.ts <name> <from-version> <to-version>')

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

const oldNpm = npmPackage(name, from)
const newNpm = npmPackage(name, to)
const typedFiles = new Bun.Glob('**/*.ts').scanSync(join(root, name, from))
for (const rel of typedFiles) {
  const js = rel.replace(/\.ts$/, '.js')
  const src = [readFileSync(join(root, name, from, rel), 'utf8'), readFileSync(join(oldNpm, js), 'utf8'), readFileSync(join(newNpm, js), 'utf8')]
  const target = erase(src[2], 'js')
  const parts = merge3(src, 'line')
  const chosen = parts.map((p) => ('clean' in p ? p.clean : p.theirs))
  if (erase(chosen.join(''), 'ts') !== target) throw new Error(`${rel}: the line merge does not erase to npm's ${to}`)
  let regions = 0, typed = 0
  for (const [k, part] of parts.entries()) {
    if ('clean' in part) continue
    regions++
    let merged = ''
    for (const p of merge3([part.ours, part.base, part.theirs], 'token')) merged += 'clean' in p ? p.clean : p.theirs
    if (merged === part.theirs || brackets(merged) !== brackets(part.theirs)) continue
    chosen[k] = merged
    if (erase(chosen.join(''), 'ts') === target) typed++
    else chosen[k] = part.theirs
  }
  const out = join(root, name, to, rel)
  mkdirSync(dirname(out), { recursive: true })
  writeFileSync(out, chosen.join(''))
  console.log(`${name}@${to} ${rel}: ${regions} changed regions, ${typed} re-typed, ${regions - typed} left untyped`)
}
