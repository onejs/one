import { describe, expect, it, vi } from 'vitest'
import { Bridge, buildIndex, collectFacts } from '../codegen/sdk/bridge'
import { emitFrameworkDocs, typescriptCallShape } from '../codegen/sdk/emit-docs'
import { emitFacade, facadeCallFormatter } from '../codegen/sdk/emit-ts'
import type { Entry } from '../codegen/sdk/emit'
import type { Graph, Symbol } from '../codegen/sdk/graph'
import { assignEntryIds } from '../codegen/sdk/identity'

const graphs = vi.hoisted(() => new Map<string, Graph>())
vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return {
    ...original,
    sdkModules: () => ['TestModule'],
    loadGraph: (module: string) => graphs.get(module) ?? null,
  }
})

const CLASS_USR = 's:10TestModule9TestClassC'
const PROTOCOL_USR = 's:10TestModule12TestProtocolP'
const CLASS_METHOD_USR = 's:10TestModule9TestClassC6doWorkyyF'
const PROTOCOL_METHOD_USR = 's:10TestModule12TestProtocolP6doWorkyyF'
const GLOBAL_USR = 's:10TestModule10globalWorkyyF'

const symbol = (overrides: Partial<Symbol> & Pick<Symbol, 'kind' | 'identifier' | 'pathComponents' | 'names' | 'accessLevel'>): Symbol => ({
  ...overrides,
})

graphs.set('TestModule', {
  module: 'TestModule',
  symbols: [
    symbol({
      kind: { identifier: 'swift.class' },
      identifier: { precise: CLASS_USR },
      pathComponents: ['TestClass'],
      names: { title: 'TestClass' },
      accessLevel: 'public',
      declarationFragments: [
        { kind: 'keyword', spelling: 'class' },
        { kind: 'text', spelling: ' ' },
        { kind: 'identifier', spelling: 'TestClass' },
      ],
    }),
    symbol({
      kind: { identifier: 'swift.protocol' },
      identifier: { precise: PROTOCOL_USR },
      pathComponents: ['TestProtocol'],
      names: { title: 'TestProtocol' },
      accessLevel: 'public',
      declarationFragments: [
        { kind: 'keyword', spelling: 'protocol' },
        { kind: 'text', spelling: ' ' },
        { kind: 'identifier', spelling: 'TestProtocol' },
      ],
    }),
    symbol({
      kind: { identifier: 'swift.method' },
      identifier: { precise: CLASS_METHOD_USR },
      pathComponents: ['TestClass', 'doWork()'],
      names: { title: 'doWork()' },
      accessLevel: 'public',
      declarationFragments: [
        { kind: 'keyword', spelling: 'func' },
        { kind: 'text', spelling: ' ' },
        { kind: 'identifier', spelling: 'doWork' },
        { kind: 'text', spelling: '()' },
      ],
    }),
    symbol({
      kind: { identifier: 'swift.method' },
      identifier: { precise: PROTOCOL_METHOD_USR },
      pathComponents: ['TestProtocol', 'doWork()'],
      names: { title: 'doWork()' },
      accessLevel: 'public',
      declarationFragments: [
        { kind: 'keyword', spelling: 'func' },
        { kind: 'text', spelling: ' ' },
        { kind: 'identifier', spelling: 'doWork' },
        { kind: 'text', spelling: '()' },
      ],
    }),
    symbol({
      kind: { identifier: 'swift.func' },
      identifier: { precise: GLOBAL_USR },
      pathComponents: ['globalWork()'],
      names: { title: 'globalWork()' },
      accessLevel: 'public',
      declarationFragments: [
        { kind: 'keyword', spelling: 'func' },
        { kind: 'text', spelling: ' ' },
        { kind: 'identifier', spelling: 'globalWork' },
        { kind: 'text', spelling: '()' },
      ],
    }),
  ],
  relationships: [],
})

const entry = (overrides: Partial<Entry> & Pick<Entry, 'key' | 'usr' | 'name' | 'kind'>): Entry => ({
  id: 0,
  main: false,
  isAsync: false,
  params: [],
  swift: '',
  ...overrides,
})

const classEntry = entry({
  key: `${CLASS_METHOD_USR}:method`,
  usr: CLASS_METHOD_USR,
  owner: 'TestModule.TestClass',
  name: 'doWork',
  kind: 'method',
})
const protocolEntry = entry({
  key: `${PROTOCOL_METHOD_USR}:method`,
  usr: PROTOCOL_METHOD_USR,
  owner: 'TestModule.TestProtocol',
  name: 'doWork',
  kind: 'method',
})
const globalEntry = entry({
  key: GLOBAL_USR,
  usr: GLOBAL_USR,
  name: 'globalWork',
  kind: 'function',
})
assignEntryIds([classEntry, protocolEntry, globalEntry])
// an unrelated default argument printed in the facade is not an api call id.
graphs.get('TestModule')!.symbols[4].declarationFragments = [
  { kind: 'keyword', spelling: 'func' },
  { kind: 'text', spelling: ` globalWork(_ value: Int = ${protocolEntry.id})` },
]
globalEntry.params.push({
  label: '_', name: 'value', type: { k: 'named', name: 'Int', args: [] },
  optional: false, hasDefault: true,
})

// the reference must not advertise callable typescript for entries the facade
// never publishes (protocol requirements here), while keeping their swift
// declarations and leaving published shapes untouched.
describe('SDK reference exports', () => {
  it('advertises typescript only for facade-published entries', () => {
    const doc = emitFrameworkDocs(
      'TestModule',
      [classEntry, protocolEntry, globalEntry],
      [],
      '27.1'
    )
    expect(doc.entries).toBe(3)
    const testClass = doc.declarations.find((d) => d.name === 'TestClass')!
    const testProtocol = doc.declarations.find((d) => d.name === 'TestProtocol')!
    expect(testClass.members).toHaveLength(1)
    expect(testClass.members[0].typescript).toContain('doWork')
    expect(testProtocol.members).toHaveLength(1)
    expect(testProtocol.members[0].typescript).toBeUndefined()
    expect(testProtocol.members[0].signature).toContain('func doWork()')
    expect(doc.globals).toHaveLength(1)
    expect(doc.globals[0].typescript).toContain('globalWork')
  })

  it('keeps published shapes identical to the facade formatter', () => {
    const graph = graphs.get('TestModule')!
    const bridge = new Bridge(buildIndex([collectFacts(graph)]))
    expect(emitFacade(
      { module: 'TestModule', entries: [classEntry, protocolEntry, globalEntry], skipped: [] },
      bridge
    )).toContain(`Int = ${protocolEntry.id}`)
    const format = facadeCallFormatter(
      { module: 'TestModule', entries: [classEntry, protocolEntry, globalEntry], skipped: [] },
      bridge
    )
    const doc = emitFrameworkDocs(
      'TestModule',
      [classEntry, protocolEntry, globalEntry],
      [],
      '27.1'
    )
    const testClass = doc.declarations.find((d) => d.name === 'TestClass')!
    expect(testClass.members[0].typescript).toBe(format(classEntry))
    expect(doc.globals[0].typescript).toBe(format(globalEntry))
  })

  it('typescriptCallShape returns undefined for unpublished entries', () => {
    expect(typescriptCallShape(classEntry)).toContain('doWork')
    expect(typescriptCallShape(protocolEntry)).toBeUndefined()
    expect(typescriptCallShape(globalEntry)).toContain('globalWork')
  })
})
