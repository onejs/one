// generates swift bindings for sdk frameworks and typechecks them against the
// installed sdk, so a binding that does not compile is caught without a
// simulator. run from packages/one:
//   bun codegen/sdk/generate.ts --out <dir> [--typecheck] Module...
import { execFile } from 'node:child_process'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'
import { Bridge, buildIndex, collectFacts } from './bridge'
import { emitModule, MINIMUM_IOS, type ModuleOutput } from './emit'
import { loadGraph, sdkModules, sdkPath, type Symbol } from './graph'
import { checkInheritedInits } from './inherited-inits'

const run = promisify(execFile)
export const RUNTIME = resolve(import.meta.dirname, '../../ios/SDK/OneSDKRuntime.swift')

// One's module carries nitro's c++ headers, so a pod importing it compiles
// with c++ interop, and the typecheck must too
export const CXX_INTEROP = ['-cxx-interoperability-mode=default', '-Xcc', '-std=c++20']
// xcode builds clang modules explicitly, and with c++ interop that drops some
// imports implicit modules keep (UIEvent.ButtonMask.button), so the typecheck
// builds them the same way
let targetArgs: string[] | undefined
const target = () => targetArgs ??= ['-swift-version', '5', '-sdk', sdkPath(), '-target', `arm64-apple-ios${MINIMUM_IOS}-simulator`,
  '-explicit-module-build', ...CXX_INTEROP]

// the bindings compile in their own pod against One, so they typecheck against
// the runtime built as a module named One and see only what it makes public
let runtimeModule: Promise<string> | undefined
function oneModule() {
  runtimeModule ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), 'one-sdk-runtime-'))
    await run('xcrun', ['swiftc', '-emit-module', '-parse-as-library', '-module-name', 'One', ...target(),
      '-emit-module-path', join(dir, 'One.swiftmodule'), RUNTIME])
    return dir
  })()
  return runtimeModule
}

// silgen and the mandatory passes reject what the typecheck admits, such as a
// capturing closure passed as a c function pointer, so the check emits sil
export async function typecheck(files: string[]) {
  const flags = target()
  try {
    await run('xcrun', ['swiftc', '-emit-sil', '-o', '/dev/null', ...flags, '-I', await oneModule(), ...files], { maxBuffer: 256 * 1024 * 1024 })
    return []
  } catch (error) {
    const stderr = error instanceof Error && 'stderr' in error ? String(error.stderr) : String(error)
    return stderr.split('\n').filter((line) => / error: /.test(line))
  }
}

export function prepare() {
  const symbols = new Map<string, Symbol>()
  const facts = []
  for (const module of sdkModules()) {
    const graph = loadGraph(module)
    if (!graph) continue
    facts.push(collectFacts(graph))
    // type declarations from every module, so isolation and owners resolve across frameworks
    for (const s of graph.symbols) {
      if (s.kind.identifier === 'swift.class' || s.kind.identifier === 'swift.protocol' ||
        s.kind.identifier === 'swift.struct' || s.kind.identifier === 'swift.enum') symbols.set(s.identifier.precise, s)
    }
  }
  // modules the compiler says to import through their public parent, learned as generation runs
  const imports = new Map<string, string>()
  return { bridge: new Bridge(buildIndex(facts)), symbols, imports }
}

const IMPLEMENTATION_DETAIL = /module '([^']+)' is an implementation detail of '[^']+'; import '([^']+)' instead/

// swaps imports of implementation detail modules for their public parent,
// keeping line numbers so compiler errors still map to entries
function withImports(swift: string, imports: Map<string, string>) {
  return swift.replace(/^import (\S+)$/gm, (line, module) => imports.has(module) ? `import ${imports.get(module)}` : line)
}

// maps compiler errors in a generated file to the entries and conformances
// that caused them
export function rejected(swift: string, output: ModuleOutput, errors: string[]) {
  const lines = swift.split('\n')
  const out = new Map<string, string>()
  for (const error of errors) {
    const match = /:(\d+):\d+: error: (.*)$/.exec(error)
    if (!match) continue
    const line = Number(match[1]) - 1
    const reason = `compile: ${match[2]}`
    let implementation: string | undefined
    for (let at = line; at >= 0; at--) {
      if (lines[at] === '// end implementation' || lines[at].startsWith('enum OneSDK_')) break
      const marker = /^\/\/ implementation (.+)$/.exec(lines[at])
      if (marker) { implementation = marker[1]; break }
    }
    if (implementation) {
      if (!out.has(implementation)) out.set(implementation, reason)
      continue
    }
    // a body bound inside its generic owner's extension falls back to the
    // canonical witness, as does the whole owner when the extension fails
    let opening: string | undefined
    for (let at = line; at >= 0 && !lines[at].startsWith('@objc(') && !lines[at].startsWith('// conformance '); at--) {
      const marker = /^\/\/ open (.+)$/.exec(lines[at])
      if (marker) { opening = marker[1]; break }
    }
    const entryCase = /^\s+case (\d+): /.exec(lines[line] ?? '')
    if (entryCase) {
      const entry = output.entries.find((e) => e.id === Number(entryCase[1]))
      // a caller-named generic falls back to the canonical witness
      const key = entry && (opening ? `open:${entry.key}` : lines[line].includes('func oneSDKPick<') ? `pick:${entry.key}` : entry.key)
      if (key && !out.has(key)) out.set(key, reason)
      continue
    }
    if (opening) {
      if (!out.has(`open:${opening}`)) out.set(`open:${opening}`, reason)
      continue
    }
    for (let at = line; at >= 0 && !lines[at].startsWith('enum OneSDK_'); at--) {
      const conformance = /^\/\/ conformance (.+)$/.exec(lines[at])
      if (conformance) {
        if (!out.has(conformance[1])) out.set(conformance[1], reason)
        break
      }
    }
  }
  return out
}

// emits a framework, then drops what the compiler rejects until it compiles
export async function generateModule(module: string, prepared: ReturnType<typeof prepare>, out: string, { table }: { table?: string } = {}, passes = 3) {
  const graph = loadGraph(module)
  if (!graph) return null
  const exclude = new Map<string, string>()
  for (const [usr, reason] of checkInheritedInits(module, graph)) exclude.set(usr, reason)
  const file = join(out, `OneSDK_${module}.swift`)
  for (let pass = 0; ; pass++) {
    const output = emitModule(graph, prepared.bridge, prepared.symbols, exclude, { table })
    output.swift = withImports(output.swift, prepared.imports)
    writeFileSync(file, output.swift)
    const errors = await typecheck([file])
    let learned = false
    for (const error of errors) {
      const match = IMPLEMENTATION_DETAIL.exec(error)
      if (match && !prepared.imports.has(match[1])) {
        prepared.imports.set(match[1], match[2])
        learned = true
      }
    }
    if (learned) continue
    const found = rejected(output.swift, output, errors)
    if (!errors.length || pass === passes || !found.size) return { output, errors, file }
    for (const [key, reason] of found) exclude.set(key, reason)
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const outAt = args.indexOf('--out')
  const out = resolve(args[outAt + 1])
  const modules = args.filter((arg, i) => !arg.startsWith('--') && i !== outAt + 1)
  mkdirSync(out, { recursive: true })
  const prepared = prepare()
  for (const module of modules) {
    const result = await generateModule(module, prepared, out)
    if (!result) continue
    const { output, errors } = result
    writeFileSync(join(out, `OneSDK_${module}.json`), JSON.stringify({ entries: output.entries.map(({ swift, ...e }) => e), skipped: output.skipped }, null, 1))
    writeFileSync(join(out, `OneSDK_${module}.errors.txt`), errors.join('\n'))
    const compiled = output.skipped.filter((s) => s.reason.startsWith('compile:')).length
    console.log(`${module}: ${output.entries.length} entries, ${output.skipped.length} skipped (${compiled} by the compiler), ${errors.length} errors left`)
  }
}
