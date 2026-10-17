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

const run = promisify(execFile)
export const RUNTIME = resolve(import.meta.dirname, '../../ios/SDK/OneSDKRuntime.swift')

const TARGET = ['-swift-version', '5', '-sdk', sdkPath(), '-target', `arm64-apple-ios${MINIMUM_IOS}-simulator`]

// the bindings compile in their own pod against One, so they typecheck against
// the runtime built as a module named One and see only what it makes public
let runtimeModule: Promise<string> | undefined
function oneModule() {
  runtimeModule ??= (async () => {
    const dir = mkdtempSync(join(tmpdir(), 'one-sdk-runtime-'))
    await run('xcrun', ['swiftc', '-emit-module', '-parse-as-library', '-module-name', 'One', ...TARGET,
      '-emit-module-path', join(dir, 'One.swiftmodule'), RUNTIME])
    return dir
  })()
  return runtimeModule
}

export async function typecheck(files: string[]) {
  try {
    await run('xcrun', ['swiftc', '-typecheck', ...TARGET, '-I', await oneModule(), ...files], { maxBuffer: 256 * 1024 * 1024 })
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
    const entryCase = /^\s+case (\d+): /.exec(lines[line] ?? '')
    if (entryCase) {
      const entry = output.entries.find((e) => e.id === Number(entryCase[1]))
      if (entry && !out.has(entry.key)) out.set(entry.key, reason)
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
export async function generateModule(module: string, prepared: ReturnType<typeof prepare>, out: string, passes = 3) {
  const graph = loadGraph(module)
  if (!graph) return null
  const exclude = new Map<string, string>()
  const file = join(out, `OneSDK_${module}.swift`)
  for (let pass = 0; ; pass++) {
    const output = emitModule(graph, prepared.bridge, prepared.symbols, exclude)
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
