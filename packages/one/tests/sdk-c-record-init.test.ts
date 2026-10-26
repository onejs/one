import { describe, expect, it } from 'vitest'
import { Bridge, buildIndex, collectFacts } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import type { Graph, Symbol } from '../codegen/sdk/graph'

const owner = 'c:@S@ReviewAggregate'
const zero = 's:So15ReviewAggregateVABycfc'
const memberwise = 's:So15ReviewAggregateV1x1yABSd_Sdtcfc'
const symbol = (usr: string, kind: string, name: string, declaration: string): Symbol => ({
  identifier: { precise: usr }, kind: { identifier: kind },
  pathComponents: usr === owner ? ['ReviewAggregate'] : ['ReviewAggregate', name],
  names: { title: name }, accessLevel: 'public',
  declarationFragments: [{ kind: 'keyword', spelling: declaration.split(' ')[0] },
    { kind: 'text', spelling: declaration.includes(' ') ? declaration.slice(declaration.indexOf(' ')) : '' }],
})
function fixture(): Graph {
  const init = symbol(memberwise, 'swift.init', 'init(x:y:)', 'init (x: Double, y: Double)')
  init.functionSignature = { parameters: ['x', 'y'].map((name) => ({ name,
    declarationFragments: [{ kind: 'identifier', spelling: name }, { kind: 'text', spelling: ': ' },
      { kind: 'typeIdentifier', spelling: 'Double', preciseIdentifier: 's:Sd' }],
  })) }
  const trivial = symbol(zero, 'swift.init', 'init()', 'init ()')
  trivial.declarationFragments = [{ kind: 'keyword', spelling: 'init' }, { kind: 'text', spelling: '()' }]
  trivial.location = { uri: 'file:///SDK/ReviewAggregate.h' }
  const symbols = [symbol(owner, 'swift.struct', 'ReviewAggregate', 'struct ReviewAggregate'), trivial, init,
    ...['x', 'y'].map((name) => symbol(`${owner}@FI@${name}`, 'swift.property', name, `var ${name}: Double`))]
  return { module: 'Review', symbols, relationships: symbols.slice(1).map((s) => ({
    kind: 'memberOf', source: s.identifier.precise, target: owner,
  })) }
}
function emitted(graph: Graph, overlays: Graph[] = []) {
  const bridge = new Bridge(buildIndex([graph, ...overlays].map(collectFacts)))
  return emitModule(graph, bridge, new Map(graph.symbols.map((s) => [s.identifier.precise, s])))
    .entries.find((e) => e.usr === memberwise)!
}

describe('imported C record construction', () => {
  it('selects the trivial zero initializer by exact function arity before writing every C field', () => {
    const entry = emitted(fixture())
    expect(entry.swift).toContain('(Review.ReviewAggregate.init as () -> Review.ReviewAggregate)()')
    expect(entry.swift).toContain('aggregate.x = (try c.arg(0) as Double)')
    expect(entry.swift).toContain('aggregate.y = (try c.arg(1) as Double)')
  })

  it.each(['extension', 'synthesized', 'swift source', 'unknown source', 'custom USR'])(
    'keeps the original memberwise call when zero construction is %s', (variant) => {
      const graph = fixture()
      const init = graph.symbols.find((s) => s.identifier.precise === zero)!
      if (variant === 'extension') init.swiftExtension = { extendedModule: 'Review' }
      if (variant === 'synthesized') init.synthesizedInit = true
      if (variant === 'swift source') init.location = { uri: 'file:///SDK/Overlay.swift' }
      if (variant === 'unknown source') delete init.location
      if (variant === 'custom USR') {
        const custom = 's:So15ReviewAggregateV7OverlayEACycfc'
        init.identifier.precise = custom
        graph.relationships.find((r) => r.source === zero)!.source = custom
      }
      expect(emitted(graph).swift).toContain('Review.ReviewAggregate(x:')
      expect(emitted(graph).swift).not.toContain('var aggregate')
    })

  it('rejects a competing zero initializer owned only by another module extension', () => {
    const graph = fixture()
    const custom = structuredClone(graph.symbols.find((s) => s.identifier.precise === zero)!)
    custom.identifier.precise = 's:So15ReviewAggregateV7OverlayEACycfc'
    custom.swiftExtension = { extendedModule: 'Review' }
    const overlay: Graph = { module: 'Overlay', symbols: [custom], relationships: [
      { kind: 'memberOf', source: custom.identifier.precise, target: owner },
    ] }
    expect(emitted(graph, [overlay]).swift).not.toContain('var aggregate')
  })
})
