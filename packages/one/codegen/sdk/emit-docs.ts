// bun codegen/sdk/emit-docs.ts --input <bindings-dir> --out <site>/data/ios-reference
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import type { Entry, Skipped } from './emit'
import type { DocMember, DocType, FrameworkSummary, FrameworkDoc } from './doc-types'
import { frameworkGroups, frameworkSummaries } from './doc-frameworks'
import { loadGraph, sdkModules, sdkVersion, type Symbol } from './graph'
import { Bridge, buildIndex, collectFacts } from './bridge'
import { emitFacade, facadeCallFormatter } from './emit-ts'

type DocumentedSymbol = Symbol & { docComment?: { lines: { text: string }[] } }

const explanations: Record<string, string> = {
  'generic owner': 'The containing type needs Swift generic type arguments.',
  generic: 'This declaration needs Swift generic type arguments.',
  'protocol with associated types':
    'This protocol needs associated types that cannot yet cross the bridge.',
  'callback returns a value synchronously':
    'This callback must return a value before Swift continues.',
  'key path': 'Swift key paths cannot yet cross the bridge.',
  'static protocol member':
    'Static protocol requirements cannot be called through an instance.',
  'owner not in the sdk index':
    'The containing type is outside the generated SDK type index.',
  metatype: 'Passing a Swift type itself is not supported.',
  'pointer out-parameter':
    'This output pointer cannot safely be represented by the bridge.',
  'opaque parameter': 'This parameter hides a concrete Swift type.',
  variadic: 'A variable number of Swift arguments is not supported.',
  selector: 'Objective-C selectors cannot cross the bridge.',
  'parameter pack': 'Swift parameter packs cannot cross the bridge.',
  inout: 'Mutating a Swift argument in place is not supported.',
  'async callback': 'This Swift callback must itself suspend asynchronously.',
  'pointer to pointer': 'Nested memory pointers cannot cross the bridge.',
  pointer: 'Raw memory pointers cannot cross the bridge.',
  'protocol initializer': 'A protocol cannot be constructed directly.',
  'variadic argument list': 'A C variable argument list cannot cross the bridge.',
  identity: 'This declaration requires Swift object identity.',
}

export function skipReason(reason: string) {
  const [category] = reason.split(':')
  if (category === 'compile')
    return `The iOS SDK compiler rejected this binding: ${reason.slice(9)}`
  return explanations[category]
    ? `${explanations[category]}${reason.includes(':') ? ` (${reason.slice(category.length + 1).trim()})` : ''}`
    : reason
}

const version = (v: { major: number; minor?: number }) => `${v.major}.${v.minor ?? 0}`
function describe(
  symbol: DocumentedSymbol | undefined,
  name: string,
  kind: string
): DocMember {
  const ios = symbol?.availability?.find((a) => a.domain === 'iOS')
  return {
    name,
    kind,
    signature: symbol?.declarationFragments?.map((f) => f.spelling).join('') || name,
    comment: symbol?.docComment?.lines.map((l) => l.text).join('\n') || undefined,
    availability: ios
      ? [
          ios.introduced && `iOS ${version(ios.introduced)}+`,
          ios.deprecated && `Deprecated in iOS ${version(ios.deprecated)}`,
          ios.obsoleted && `Unavailable in iOS ${version(ios.obsoleted)}`,
          ios.isUnconditionallyUnavailable && 'Unavailable on iOS',
          ios.isUnconditionallyDeprecated && 'Deprecated',
        ]
          .filter(Boolean)
          .join(' · ') || undefined
      : undefined,
  }
}

export type CallShape = (entry: Entry) => string | undefined
let docsBridge: Bridge | undefined
function referenceBridge() {
  return (docsBridge ??= new Bridge(
    buildIndex(
      sdkModules().flatMap((module) => {
        const graph = loadGraph(module)
        return graph ? [collectFacts(graph)] : []
      })
    )
  ))
}
// ids the facade actually publishes, read from its own output. an entry the
// facade never emits (a protocol requirement, a typealias member, an unknown
// owner) keeps its swift declaration but advertises no typescript call. entry
// ids are unique signature hashes, so a whole-number match is the entry.
function publishedIds(module: string, entries: Entry[], skipped: Skipped[]): Set<number> {
  const facade = emitFacade({ module, entries, skipped }, referenceBridge())
  const ids = new Set<number>()
  for (const match of facade.matchAll(/\b\d+\b/g)) ids.add(Number(match[0]))
  return ids
}
export function typescriptCallShape(entry: Entry): string | undefined {
  const module = entry.owner?.split('.')[0] ?? ''
  const shape = facadeCallFormatter(
    { module, entries: [entry], skipped: [] },
    referenceBridge()
  )(entry)
  if (!publishedIds(module, [entry], []).has(entry.id)) return undefined
  return shape
}

export function emitFrameworkDocs(
  module: string,
  entries: Entry[],
  skipped: Skipped[],
  sdk: string,
  callShape: CallShape = typescriptCallShape
): FrameworkDoc {
  const graph = loadGraph(module)
  if (!graph) throw new Error(`No symbol graph for ${module}`)
  const formatCall =
    callShape === typescriptCallShape
      ? facadeCallFormatter({ module, entries, skipped }, referenceBridge())
      : callShape
  const published =
    callShape === typescriptCallShape ? publishedIds(module, entries, skipped) : undefined
  const symbols = new Map(
    graph.symbols.map((s) => [s.identifier.precise, s as DocumentedSymbol])
  )
  const declarations = new Map<string, DocType>()
  for (const s of symbols.values()) {
    if (!/^swift\.(class|struct|enum|protocol|typealias)$/.test(s.kind.identifier))
      continue
    const name = s.pathComponents.join('.')
    declarations.set(name, {
      ...describe(s, name, s.kind.identifier.slice(6)),
      members: [],
      skipped: [],
    })
  }
  const globals: DocMember[] = []
  for (const entry of entries) {
    const typescript = formatCall(entry)
    const doc = {
      ...describe(symbols.get(entry.usr), entry.name, entry.kind),
      typescript: published && !published.has(entry.id) ? undefined : typescript,
      out: entry.params.some((p) => p.out || p.inout)
        ? entry.params.filter((p) => p.out || p.inout).map((p) => p.name)
        : undefined,
    }
    const owner = entry.owner?.replace(`${module}.`, '')
    if (owner && declarations.has(owner)) declarations.get(owner)!.members.push(doc)
    else globals.push(doc)
  }
  const omissions = skipped.map((s) => ({ name: s.path, reason: skipReason(s.reason) }))
  for (const omission of omissions) {
    let path = omission.name.replace(`${module}.`, '')
    while (path.includes('.')) {
      path = path.slice(0, path.lastIndexOf('.'))
      if (declarations.has(path)) {
        declarations.get(path)!.skipped.push(omission)
        break
      }
    }
    if (declarations.has(omission.name))
      declarations.get(omission.name)!.skipped.push(omission)
  }
  return {
    name: module,
    group:
      Object.entries(frameworkGroups).find(([, names]) => names.includes(module))?.[0] ??
      'Additional SDK Modules',
    summary:
      frameworkSummaries[module] ||
      `Explore ${module} types and the APIs available through One's generated iOS bindings.`,
    sdk,
    types: declarations.size,
    entries: entries.length,
    skipped: skipped.length,
    declarations: [...declarations.values()].sort((a, b) => a.name.localeCompare(b.name)),
    globals,
    omissions,
  }
}

if (import.meta.main) {
  const args = process.argv.slice(2)
  const option = (name: string) => args[args.indexOf(name) + 1]
  if (!args.includes('--input') || !args.includes('--out'))
    throw new Error('Use --input <bindings-dir> --out <site>/data/ios-reference')
  const input = resolve(option('--input'))
  const out = resolve(option('--out'))
  mkdirSync(out, { recursive: true })
  const summaries: FrameworkSummary[] = []
  const search: Record<string, string[]> = {}
  const sdk = sdkVersion()
  for (const file of readdirSync(input)
    .filter((f) => /^OneSDK_.+\.json$/.test(f))
    .sort()) {
    const module = file.slice(7, -5)
    const { entries, skipped } = JSON.parse(readFileSync(join(input, file), 'utf8'))
    const doc = emitFrameworkDocs(module, entries, skipped, sdk)
    writeFileSync(join(out, `${module}.json`), JSON.stringify(doc))
    const { declarations, globals, omissions, sdk: _, ...summary } = doc
    summaries.push(summary)
    search[module] = declarations.map((t) => t.name)
  }
  const groups = [...Object.keys(frameworkGroups), 'Additional SDK Modules'].filter(
    (group) => summaries.some((f) => f.group === group)
  )
  writeFileSync(
    join(out, 'index.json'),
    JSON.stringify({ sdk, groups, frameworks: summaries })
  )
  const searchOut = resolve(out, '../../public/ios-reference')
  mkdirSync(searchOut, { recursive: true })
  writeFileSync(join(searchOut, 'search.json'), JSON.stringify(search))
  console.log(
    `Generated ${summaries.length} frameworks and ${Object.values(search).reduce((n, names) => n + names.length, 0)} type names for iOS SDK ${sdk}`
  )
}
