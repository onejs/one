import { describe, expect, it, vi } from 'vitest'
import { Bridge, buildIndex, collectFacts } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import { emitFacade } from '../codegen/sdk/emit-ts'
import type { Graph, Symbol } from '../codegen/sdk/graph'

const graphs = vi.hoisted(() => new Map<string, Graph>())
vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return { ...original, loadGraph: (module: string) => graphs.get(module) ?? null }
})

const allocator = 'c:@T@CFAllocatorRef'
const constant = (name: string, usr = `c:@${name}`): Symbol => ({
  kind: { identifier: 'swift.var' }, identifier: { precise: usr },
  pathComponents: [name], names: { title: name }, accessLevel: 'public',
  declarationFragments: [
    { kind: 'keyword', spelling: 'let' }, { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: name }, { kind: 'text', spelling: ': ' },
    { kind: 'typeIdentifier', spelling: 'CFAllocator', preciseIdentifier: allocator },
    { kind: 'text', spelling: '!' },
  ],
})
function emitted(symbols: Symbol[]) {
  const graph: Graph = { module: 'CoreFoundation', relationships: [], symbols: [
    { kind: { identifier: 'swift.class' }, identifier: { precise: allocator },
      pathComponents: ['CFAllocator'], names: { title: 'CFAllocator' }, accessLevel: 'public' },
    ...symbols,
  ] }
  graphs.set(graph.module, graph)
  const bridge = new Bridge(buildIndex([collectFacts(graph)]))
  const output = emitModule(graph, bridge, new Map())
  const facade = emitFacade({ module: graph.module,
    entries: output.entries.map(({ swift, ...entry }) => entry), skipped: output.skipped }, bridge)
  return { output, facade }
}

describe('C pointer sentinel constants', () => {
  it('omits the non-object allocator sentinel from native dispatch and the eager public facade', () => {
    const { output, facade } = emitted([constant('kCFAllocatorUseContext')])
    expect(output.entries).toEqual([])
    expect(output.skipped).toEqual([{
      usr: 'c:@kCFAllocatorUseContext', path: 'kCFAllocatorUseContext',
      reason: 'non-object C pointer sentinel cannot be retained as an SDK handle',
    }])
    expect(facade).not.toContain('kCFAllocatorUseContext')
  })

  it('keeps null and real allocator constants with their existing native calls and nullable handles', () => {
    const names = ['Default', 'SystemDefault', 'Malloc', 'MallocZone', 'Null'].map((name) => `kCFAllocator${name}`)
    const { output, facade } = emitted(names.map((name) => constant(name)))
    expect(output.skipped).toEqual([])
    expect(output.entries.map((entry) => entry.name)).toEqual([...names].sort())
    for (const name of names) {
      expect(output.entries.find((entry) => entry.name === name)?.swift).toBe(`return c.out(CoreFoundation.${name})`)
      expect(facade).toContain(`export const ${name}: (CFAllocator) | null = callSDK`)
    }
  })

  it('does not reject an unrelated C global with the same spelling', () => {
    const { output } = emitted([constant('kCFAllocatorUseContext', 'c:Custom.h@kCFAllocatorUseContext')])
    expect(output.entries).toHaveLength(1)
    expect(output.skipped).toEqual([])
  })
})
