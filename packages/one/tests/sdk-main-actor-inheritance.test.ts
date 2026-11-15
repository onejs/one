import { describe, expect, it, vi } from 'vitest'
import { Bridge, buildIndex, collectFacts } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import { emitFacade } from '../codegen/sdk/emit-ts'
import type { Graph, Symbol } from '../codegen/sdk/graph'

vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return { ...original, loadGraph: () => null }
})

// swift infers a class's global actor from its superclass. the sdk spells
// @MainActor on UIViewController but not on UIActivityViewController, and a
// framework subclass such as MKMapView inherits it from another module.

const usr = (name: string) => `c:objc(cs)${name}`

const classSymbol = (name: string, attributes = ''): Symbol => ({
  kind: { identifier: 'swift.class' },
  identifier: { precise: usr(name) },
  pathComponents: [name],
  names: { title: name },
  accessLevel: 'open',
  declarationFragments: [
    ...(attributes ? [{ kind: 'attribute', spelling: attributes }, { kind: 'text', spelling: ' ' }] : []),
    { kind: 'keyword', spelling: 'class' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: name },
  ],
})

const titleSymbol = (owner: string, attributes = ''): Symbol => ({
  kind: { identifier: 'swift.property' },
  identifier: { precise: `${usr(owner)}(py)title` },
  pathComponents: [owner, 'title'],
  names: { title: 'title' },
  accessLevel: 'open',
  declarationFragments: [
    ...(attributes ? [{ kind: 'attribute', spelling: attributes }, { kind: 'text', spelling: ' ' }] : []),
    { kind: 'keyword', spelling: 'var' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: 'title' },
    { kind: 'text', spelling: ': ' },
    { kind: 'typeIdentifier', spelling: 'String', preciseIdentifier: 's:SS' },
    { kind: 'text', spelling: ' { ' },
    { kind: 'keyword', spelling: 'get' },
    { kind: 'text', spelling: ' ' },
    { kind: 'keyword', spelling: 'set' },
    { kind: 'text', spelling: ' }' },
  ],
})

const initSymbol = (owner: string): Symbol => ({
  kind: { identifier: 'swift.init' },
  identifier: { precise: `${usr(owner)}(im)init` },
  pathComponents: [owner, 'init()'],
  names: { title: 'init()' },
  accessLevel: 'public',
  declarationFragments: [
    { kind: 'keyword', spelling: 'init' },
    { kind: 'text', spelling: '()' },
  ],
  functionSignature: { parameters: [] },
})

// TestRoot lives in another framework; TestBase and TestSheet inherit its
// isolation through a two-level chain. TestPlain descends from a nonisolated
// root, and TestLoopA and TestLoopB name each other as superclasses.
const rootGraph: Graph = {
  module: 'TestUI',
  symbols: [classSymbol('TestRoot', '@MainActor'), classSymbol('TestNeutral')],
  relationships: [],
}

const members = (owner: string, symbols: Symbol[]) =>
  symbols.map((s) => ({ kind: 'memberOf', source: s.identifier.precise, target: usr(owner) }))
const inherits = (child: string, parent: string) => ({ kind: 'inheritsFrom', source: usr(child), target: usr(parent) })

const sheetMembers = [initSymbol('TestSheet'), titleSymbol('TestSheet')]
const plainMembers = [initSymbol('TestPlain'), titleSymbol('TestPlain')]
const explicitMembers = [titleSymbol('TestExplicit', '@MainActor')]
const loopMembers = [titleSymbol('TestLoopA')]

const graph: Graph = {
  module: 'TestModule',
  symbols: [
    classSymbol('TestBase'), classSymbol('TestSheet'), classSymbol('TestPlain'), classSymbol('TestExplicit'),
    classSymbol('TestLoopA'), classSymbol('TestLoopB'),
    ...sheetMembers, ...plainMembers, ...explicitMembers, ...loopMembers,
  ],
  relationships: [
    inherits('TestBase', 'TestRoot'), inherits('TestSheet', 'TestBase'),
    inherits('TestPlain', 'TestNeutral'), inherits('TestExplicit', 'TestNeutral'),
    inherits('TestLoopA', 'TestLoopB'), inherits('TestLoopB', 'TestLoopA'),
    ...members('TestSheet', sheetMembers), ...members('TestPlain', plainMembers),
    ...members('TestExplicit', explicitMembers), ...members('TestLoopA', loopMembers),
  ],
}

const emit = () => {
  const bridge = new Bridge(buildIndex([collectFacts(rootGraph), collectFacts(graph)]))
  // generation passes every framework's type declarations, so isolation resolves across them
  const all = new Map([...rootGraph.symbols, ...graph.symbols].map((s) => [s.identifier.precise, s]))
  const output = emitModule(graph, bridge, all)
  const facade = emitFacade(
    { module: 'TestModule', entries: output.entries.map(({ swift, ...e }) => e), skipped: output.skipped },
    bridge
  )
  return { output, facade }
}

const classBlock = (facade: string, name: string) => {
  const block = new RegExp(`class ${name} extends [^\\n]*\\n[\\s\\S]*?\\n}\\n`).exec(facade)?.[0]
  expect(block, name).toBeDefined()
  return block!
}

const isolation = (output: ReturnType<typeof emit>['output'], owner: string) =>
  Object.fromEntries(output.entries.filter((e) => e.owner === `TestModule.${owner}`).map((e) => [e.kind, e.main]))

describe('main actor inheritance', () => {
  it('isolates members of a subclass whose superclass chain crosses frameworks to @MainActor', () => {
    const { output } = emit()
    expect(isolation(output, 'TestSheet')).toEqual({ init: true, get: true, set: true })
    for (const entry of output.entries.filter((e) => e.owner === 'TestModule.TestSheet')) {
      const dispatch = output.swift.split('\n').filter((l) => l.startsWith(`    case ${entry.id}: `) && l.includes('{ @MainActor in '))
      expect(dispatch, entry.key).toHaveLength(1)
      expect(dispatch[0]).toContain('{ @MainActor in ')
    }
  })

  it('awaits the inherited isolation in typescript', () => {
    const sheet = classBlock(emit().facade, 'TestSheet')
    expect(sheet).toContain('static init(): Promise<TestSheet> { return callSDKAsync<TestSheet>(')
    expect(sheet).toContain('get title(): Promise<string> { return callSDKAsync<string>(')
    expect(sheet).toContain('setTitle(value: string): Promise<void> { return callSDKAsync<void>(')
    expect(sheet).not.toContain('set title(')
  })

  it('keeps a subclass of a nonisolated root synchronous', () => {
    const { output, facade } = emit()
    expect(isolation(output, 'TestPlain')).toEqual({ init: false, get: false, set: false })
    const plain = classBlock(facade, 'TestPlain')
    expect(plain).toContain('static init(): TestPlain { return callSDK<TestPlain>(')
    expect(plain).toContain('set title(value: string) { callSDK<void>(')
  })

  it('keeps an explicit @MainActor member of a nonisolated class main-isolated', () => {
    expect(isolation(emit().output, 'TestExplicit')).toEqual({ get: true, set: true })
  })

  it('ends at a superclass cycle', () => {
    expect(isolation(emit().output, 'TestLoopA')).toEqual({ get: false, set: false })
  })
})
