// omits synthesized -init the generator cannot prove legal. a symbol graph
// lists only the initializers a class declares, so the graph synthesizes
// init() for every subclass that declares none. a class that declares custom
// initializers but no init() may still support it (UIViewController.init works)
// or abort at runtime (CNLabeledValue.init aborts), and neither compiler nor
// header nor graph distinguishes the two: clang cannot see private
// unavailability. so those omit with an explicit cannot-prove reason, never a
// claim they are natively illegal. a natively probed allowlist keeps the proven
// controls; header-marked unavailable inits fail the clang probe below and drop
// with that reason; pure-inheritance inits clang accepts are kept.
import { execFileSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { MINIMUM_IOS } from './emit'
import { sdkPath, type Graph } from './graph'

export type ClangResult = { status: number; stderr: string }
export type ClangRunner = (args: string[], source: string) => ClangResult

const defaultRunner: ClangRunner = (args, source) => {
  const dir = mkdtempSync(join(tmpdir(), 'one-sdk-inits-'))
  try {
    const file = join(dir, 'probe.m')
    writeFileSync(file, source)
    try {
      execFileSync('xcrun', ['clang', ...args, file], { encoding: 'utf8', stdio: ['ignore', 'ignore', 'pipe'] })
      return { status: 0, stderr: '' }
    } catch (error) {
      const e = error as { status?: number; stderr?: unknown }
      return { status: e.status ?? 1, stderr: String(e.stderr ?? '') }
    }
  } finally {
    rmSync(dir, { recursive: true, force: true })
  }
}

type Synthesized = { usr: string; name: string; custom: number }

// synthesized inits natively probed working on macos foundation
// ([[NSCache alloc] init], [[NSMapTable alloc] init], [[NSHashTable alloc]
// init] all exit 0), kept even though their classes declare custom inits
const PROVEN = new Set([
  'c:objc(cs)NSCache(im)init',
  'c:objc(cs)NSMapTable(im)init',
  'c:objc(cs)NSHashTable(im)init',
])

// each synthesized init with its owner's objective-c name (from the usr, not
// the path: swift drops some ns prefixes) and its count of declared custom
// initializers, excluding the NSCoding init a conformance adds
function synthesized(graph: Graph): Synthesized[] {
  const owners = new Map(graph.relationships.filter((r) => r.kind === 'memberOf').map((r) => [r.source, r.target]))
  const byUsr = new Map(graph.symbols.map((s) => [s.identifier.precise, s]))
  const out: Synthesized[] = []
  for (const s of graph.symbols.filter((s) => s.synthesizedInit && s.kind.identifier === 'swift.init')) {
    const ownerUsr = owners.get(s.identifier.precise)
    const owner = ownerUsr ? byUsr.get(ownerUsr) : undefined
    const name = ownerUsr ? /^c:objc\(cs\)([^()]+)$/.exec(ownerUsr)?.[1] : undefined
    if (!ownerUsr || !owner || !name) throw new Error(`synthesized ${s.identifier.precise} has no objective-c owner`)
    const custom = graph.symbols.filter((d) => d.kind.identifier === 'swift.init' && owners.get(d.identifier.precise) === ownerUsr
      && d.identifier.precise !== s.identifier.precise && !d.synthesizedInit && !/\(im\)initWithCoder:/.test(d.identifier.precise)).length
    out.push({ usr: s.identifier.precise, name, custom })
  }
  return out
}

// maps synthesized init usrs to skip reasons. a class that declares custom
// initializers omits its synthesized init as cannot-prove unless natively
// proven; the rest batch into one header-aware clang probe per framework,
// where #line names each function so its errors map back to its init. an
// unavailable init drops with that reason, a name the module does not expose
// omits as cannot-probe, and anything else fails loudly instead of guessing.
export function checkInheritedInits(
  module: string,
  graph: Graph,
  { runner = defaultRunner, sdk }: { runner?: ClangRunner; sdk?: string } = {},
): Map<string, string> {
  const rejected = new Map<string, string>()
  const pending: Synthesized[] = []
  for (const init of synthesized(graph)) {
    if (init.custom && !PROVEN.has(init.usr)) {
      rejected.set(init.usr, `inherited init: cannot prove legal (class declares ${init.custom} custom initializer${init.custom === 1 ? '' : 's'})`)
    } else pending.push(init)
  }
  if (!pending.length) return rejected
  const source = [`@import ${module};`, ...pending.map(({ name }, i) =>
    `#line 1 "one-sdk-init-${i}"\nstatic void oneSDKInitProbe${i}(void) { (void)[[${name} alloc] init]; }`)].join('\n')
  const args = ['-fsyntax-only', '-ferror-limit=0', '-x', 'objective-c', '-fmodules', '-isysroot', sdk ?? sdkPath(),
    '-target', `arm64-apple-ios${MINIMUM_IOS}-simulator`]
  const { status, stderr } = runner(args, source)
  const errors = stderr.split('\n').filter((line) => / error: /.test(line))
  if (status !== 0 && !errors.length) throw new Error(`inherited-init probe for ${module} failed without errors: ${stderr.slice(0, 500)}`)
  for (const error of errors) {
    const match = /^one-sdk-init-(\d+):\d+:\d+: error: (.*)$/.exec(error)
    const init = match ? pending[Number(match[1])] : undefined
    if (!init) throw new Error(`unexplained inherited-init error for ${module}: ${error}`)
    if (/use of undeclared identifier|unknown receiver|unknown type name/.test(match[2])) {
      if (!rejected.has(init.usr)) rejected.set(init.usr, `inherited init: cannot probe (${match[2].slice(0, 120)})`)
      continue
    }
    if (!/unavailable/i.test(match[2])) throw new Error(`unexplained inherited-init error for ${module}: ${error}`)
    if (!rejected.has(init.usr)) rejected.set(init.usr, `inherited init: clang: ${match[2]}`)
  }
  return rejected
}
