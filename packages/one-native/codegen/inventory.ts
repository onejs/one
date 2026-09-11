import { execFileSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
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
}

const run = (file: string, args: string[]) =>
  execFileSync(file, args, { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 }).trim()

export function readInventory(root: string) {
  const cache = join(root, '.codegen-cache')
  mkdirSync(cache, { recursive: true })
  const sdk = run('xcrun', ['--sdk', 'iphonesimulator', '--show-sdk-path'])
  const swiftc = run('xcrun', ['--find', 'swiftc'])
  const host = resolve(dirname(swiftc), '../lib/swift/host')
  const binary = join(cache, 'extract')
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
  const paths = ['SwiftUI', 'SwiftUICore'].map((module) =>
    join(
      sdk,
      `System/Library/Frameworks/${module}.framework/Modules/${module}.swiftmodule/arm64-apple-ios-simulator.swiftinterface`
    )
  )
  const inventory: Declaration[] = JSON.parse(run(binary, paths))
  return { sdk, swiftc, paths, inventory }
}

function iosVersion(attribute: string): number | undefined {
  if (!attribute.startsWith('@available(')) return
  const short = attribute.match(/\biOS\s+(\d+(?:\.\d+)?)\b/)
  if (short) return Number(short[1])
  if (/^@available\(\s*iOS\s*,/.test(attribute)) {
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
  if (!/^@available\(\s*(?:iOS|\*)\s*,/.test(attribute)) return false
  const body = attribute.replace(/"(?:\\.|[^"\\])*"/g, '""')
  return /\bunavailable\b/.test(body) || /\bdeprecated\b/.test(body)
}

export function available(declaration: Declaration) {
  return !declaration.attributes.some(restricted)
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
