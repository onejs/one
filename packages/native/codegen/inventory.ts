import { execFileSync } from 'node:child_process'
import { mkdirSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'

export type Declaration = {
  module: string
  owner: string
  kind: string
  name: string
  attributes: string[]
  requirements?: string[]
  parameters: { label: string; name: string; type: string; defaultValue?: string }[]
  type?: string
  line: number
  inheritedTypes?: string[]
  generic?: boolean
  enumCase?: boolean
  stored?: boolean
  writable?: boolean
  isStatic?: boolean
  failable?: boolean
}

const run = (file: string, args: string[]) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()

export function readInventory(root: string) {
  const cache = join(root, '.codegen-cache')
  mkdirSync(cache, { recursive: true })
  const sdk = run('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'])
  const swiftc = run('xcrun', ['--find', 'swiftc'])
  const host = resolve(dirname(swiftc), '../lib/swift/host')
  const binary = join(cache, `extract-${process.pid}`)
  // swiftui is not one module. it extends other frameworks through an overlay module each
  // (_WebKit_SwiftUI, _AVKit_SwiftUI, and so on), and those hold real swiftui api: WebView,
  // VideoPlayer, PhotosPicker, Map, quickLookPreview. read every one, not just the core two.
  const overlays = readdirSync(join(sdk, 'System/Library/Frameworks'))
    .filter((entry) => entry.startsWith('_') && entry.endsWith('_SwiftUI.framework'))
    .map((entry) => entry.slice(0, -'.framework'.length))
    .sort()
  const modules = ['SwiftUI', 'SwiftUICore', ...overlays]
  // supporting modules provide argument values but do not expand the SwiftUI coverage universe.
  const paths = [...modules, 'AppIntents', 'CoreText', 'StoreKit', 'Symbols', 'WorkoutKit'].map((module) =>
    join(
      sdk,
      `System/Library/Frameworks/${module}.framework/Modules/${module}.swiftmodule/arm64-apple-ios-simulator.swiftinterface`
    )
  )
  let rawInventory: Declaration[]
  try {
    run(swiftc, [
      '-sdk',
      run('xcrun', ['--sdk', 'macosx', '--show-sdk-path']),
      '-I',
      host,
      '-L',
      host,
      '-Xlinker',
      '-rpath',
      '-Xlinker',
      host,
      join(root, 'codegen/Extract.swift'),
      '-o',
      binary,
    ])
    rawInventory = JSON.parse(run(binary, paths))
  } finally {
    rmSync(binary, { force: true })
  }
  const norm = (str?: string) =>
    str ? str.replace(/\.\w+::/g, '.').replaceAll('::', '.') : str
  const signature = (parameters: readonly { label: string; type: string }[]) =>
    JSON.stringify(parameters.map((p) => [p.label, p.type]))
  const normalizeReqs = (requirements?: readonly string[]) =>
    JSON.stringify((requirements ?? []).map((value) => value.replace(/\s+/g, '')).sort())

  const seen = new Set<string>()
  const inventory: Declaration[] = []
  for (const d of rawInventory) {
    const normOwner = norm(d.owner) ?? ''
    const normType = norm(d.type)
    const normParams = d.parameters.map((p) => ({ ...p, type: norm(p.type) ?? '' }))
    const normReqs = (d.requirements ?? []).map((r) => norm(r) ?? '')
    const key = `${d.module}|${normOwner}|${d.kind}|${d.name}|${signature(normParams)}|${normalizeReqs(normReqs)}`
    if (!seen.has(key)) {
      seen.add(key)
      inventory.push({
        ...d,
        name: d.kind === 'conformance' ? norm(d.name) ?? d.name : d.name,
        owner: normOwner,
        type: normType,
        parameters: normParams,
        requirements: normReqs,
        inheritedTypes: d.inheritedTypes?.map((type) => norm(type) ?? type),
      })
    }
  }
  return { sdk, swiftc, modules, paths, inventory }
}

function iosVersion(attribute: string): number | undefined {
  if (!attribute.startsWith('@available(')) return
  const anyApple = attribute.match(/\banyAppleOS\s+(\d+(?:\.\d+)?)\b/)
  if (anyApple) return Number(anyApple[1])
  const short = attribute.match(/\biOS\s+(\d+(?:\.\d+)?)\b/)
  if (short) return Number(short[1])
  if (/^@available\(\s*(?:iOS|anyAppleOS)\s*,/.test(attribute)) {
    const introduced = attribute.match(/\bintroduced:\s*(\d+(?:\.\d+)?)/)
    if (introduced) return Number(introduced[1])
    if (/\bintroduced:/.test(attribute)) {
      throw new Error(`unrecognized iOS availability: ${attribute}`)
    }
    return
  }
  if (/\biOS\b/.test(attribute)) {
    throw new Error(`unrecognized iOS availability: ${attribute}`)
  }
}

export function ios(declaration: Declaration) {
  const versions = declaration.attributes.flatMap((attribute) => {
    const version = iosVersion(attribute)
    return version == null ? [] : [version]
  })
  return versions.length ? Math.max(...versions) : 0
}

function restricted(attribute: string) {
  if (attribute.startsWith('@_spi')) return true
  if (!/^@available\(\s*(?:iOS|anyAppleOS|\*)\s*,/.test(attribute)) return false
  const body = attribute.replace(/"(?:\\.|[^"\\])*"/g, '""')
  return /\bunavailable\b/.test(body) || /\bdeprecated\b/.test(body)
}

function withdrawn(attribute: string) {
  if (attribute.startsWith('@_spi')) return true
  if (!/^@available\(\s*(?:iOS|anyAppleOS|\*)\s*,/.test(attribute)) return false
  const body = attribute.replace(/"(?:\\.|[^"\\])*"/g, '""')
  return /\bunavailable\b/.test(body)
}

export function available(declaration: Declaration) {
  return !declaration.attributes.some(restricted)
}

// enum cases stay mapped while the SDK ships them, even soft-deprecated: deprecation
// lands in newer SDKs first, so filtering on it makes output depend on the toolchain.
// exact selectors keep available(): each has a human-authored recipe, so a deprecation
// there throws one precise error instead of silently rebinding.
export function present(declaration: Declaration) {
  return !declaration.attributes.some(withdrawn)
}

const ownerName = (declaration: Declaration) => declaration.owner.split('.').at(-1)

const signature = (parameters: readonly { label: string; type: string }[]) =>
  JSON.stringify(parameters.map((parameter) => [parameter.label, parameter.type]))

export function selectConstructor(
  inventory: readonly Declaration[],
  selector: { type: string; parameters: readonly { label: string; type: string }[] }
) {
  const wanted = signature(selector.parameters)
  const matches = inventory.filter(
    (declaration) =>
      declaration.kind === 'init' &&
      ownerName(declaration) === selector.type &&
      available(declaration) &&
      signature(declaration.parameters) === wanted
  )
  const shown = `${selector.type}(${selector.parameters.map((parameter) => `${parameter.label}: ${parameter.type}`).join(', ')})`
  if (matches.length === 1) return matches[0]
  if (!matches.length) throw new Error(`SDK constructor signature changed: ${shown}`)
  throw new Error(`ambiguous SDK constructor: ${shown}`)
}

export function selectEnumModifier(inventory: readonly Declaration[], enumType: string) {
  // a style enum resolves through the generic constraint that names it; a value enum
  // resolves through the single parameter that carries it. either way exactly one
  // modifier name must qualify, or the recipe keeps spelling the call out.
  const style = enumType.endsWith('Style')
  const matches = inventory.filter((declaration) => {
    if (declaration.kind !== 'func' || ownerName(declaration) !== 'View') return false
    // resolution follows present(), not available(): a soft-deprecated modifier the SDK
    // still ships keeps resolving, so derivation does not depend on the toolchain.
    if (!present(declaration)) return false
    // both shapes apply as `name(_:)`: a style through a generic parameter constrained
    // on it, a value through the parameter itself.
    if (declaration.parameters.length !== 1 || declaration.parameters[0].label !== '_')
      return false
    if (style) {
      return (declaration.requirements ?? []).some((requirement) =>
        requirement.replace(/\s+/g, '').includes(`SwiftUI.${enumType}`)
      )
    }
    // a nested SDK type flattens to one name (Image.Scale answers as ImageScale).
    const components = declaration.parameters[0].type.replace('?', '').split('.')
    return (
      components.at(-1) === enumType ||
      components.slice(-2).join('') === enumType
    )
  })
  const names = [...new Set(matches.map((declaration) => declaration.name))].sort()
  if (names.length !== 1)
    throw new Error(
      `SDK enum modifier for ${enumType}: expected one name, found ${names.length}${names.length ? ` (${names.join(', ')})` : ''}`
    )
  return matches.find((declaration) => declaration.name === names[0])!
}

export function selectModifier(
  inventory: readonly Declaration[],
  selector: {
    name: string
    parameters: readonly { label: string; type: string }[]
    requirements: readonly string[]
  }
) {
  const normalize = (requirements: readonly string[]) =>
    JSON.stringify(requirements.map((value) => value.replace(/\s+/g, '')).sort())
  const matches = inventory.filter(
    (declaration) =>
      declaration.kind === 'func' &&
      ownerName(declaration) === 'View' &&
      declaration.name === selector.name &&
      available(declaration) &&
      signature(declaration.parameters) === signature(selector.parameters) &&
      normalize(declaration.requirements ?? []) === normalize(selector.requirements)
  )
  if (matches.length !== 1)
    throw new Error(
      `SDK modifier ${selector.name}: expected one exact match, found ${matches.length}`
    )
  return matches[0]
}
