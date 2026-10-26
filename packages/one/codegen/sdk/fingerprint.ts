// identifies the sdk generator abi for cache keys and table identity: a sha256
// over the emitter sources, runtime, specs and schema minimum version. inputs
// sort by normalized relative name with normalized content, no sdk or package
// version and no absolute paths, so source and the shipped bundle hash
// identically and version-only or control-schema bumps keep the same abi.
// reads actual files; the bundle bakes this in as a constant (see build.ts).
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const defaultRoot = join(dirname(fileURLToPath(import.meta.url)), '../..')

// emitter semantics only: app plus the bridge and emitters it runs, the native
// runtime and wire it must match, and the schema floor app enforces.
// declarations, coverage, docs and view drivers stay out (publication tooling,
// not abi), as do build meta, type declarations and tests.
const EMITTER_SOURCES = [
  'codegen/sdk/app.ts',
  'codegen/sdk/bridge.ts',
  'codegen/sdk/c-linkage.ts',
  'codegen/sdk/emit-protocols.ts',
  'codegen/sdk/emit-ts.ts',
  'codegen/sdk/emit.ts',
  'codegen/sdk/fingerprint.ts',
  'codegen/sdk/generate.ts',
  'codegen/sdk/inherited-inits.ts',
  'codegen/sdk/graph.ts',
  'codegen/sdk/identity.ts',
  'codegen/sdk/types.ts',
  'ios/Nitro/HybridOneSDK.swift',
  'ios/SDK/OneSDKRuntime.swift',
  'src/platform/sdk/wire.ts',
  'src/platform/specs/OneSDK.nitro.ts',
].sort()

export function inputFiles(): string[] {
  return [...EMITTER_SOURCES]
}

export function hashInputs(inputs: { name: string; content: string }[]): string {
  const hash = createHash('sha256')
  const sorted = [...inputs].sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  for (const { name, content } of sorted) {
    hash.update(name, 'utf8').update('\0', 'utf8')
    hash.update(content.replace(/\r\n/g, '\n'), 'utf8').update('\0', 'utf8')
  }
  return hash.digest('hex')
}

export function fingerprintForRoot(root = defaultRoot): string {
  const inputs = EMITTER_SOURCES.map((name) => ({ name, content: readFileSync(join(root, name), 'utf8') }))
  const schema = JSON.parse(readFileSync(join(root, 'schema.json'), 'utf8')) as { minimumVersion: unknown }
  if (typeof schema.minimumVersion !== 'number') throw new Error('schema.json#minimumVersion must be a number')
  inputs.push({ name: 'schema.json#minimumVersion', content: String(schema.minimumVersion) })
  return hashInputs(inputs)
}

export function generatorFingerprint(): string {
  return fingerprintForRoot()
}
