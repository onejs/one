import { describe, expect, it } from 'vitest'
import { Bridge } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import type { Graph, Symbol } from '../codegen/sdk/graph'

const owner = (where: string, constraints?: unknown[]): Symbol => ({
  kind: { identifier: 'swift.class' }, identifier: { precise: 'c:objc(cs)NSCache' },
  pathComponents: ['NSCache'], names: { title: 'NSCache' }, accessLevel: 'open',
  swiftGenerics: { parameters: [{ name: 'KeyType' }, { name: 'ObjectType' }], constraints },
  declarationFragments: [{ kind: 'text', spelling: `class NSCache<KeyType, ObjectType> ${where}` }],
})
const initializer: Symbol = {
  kind: { identifier: 'swift.init' }, identifier: { precise: 'c:objc(cs)NSCache(im)init' },
  pathComponents: ['NSCache', 'init()'], names: { title: 'init()' }, accessLevel: 'open',
  functionSignature: { parameters: [] },
  declarationFragments: [{ kind: 'keyword', spelling: 'init' }, { kind: 'text', spelling: '()' }],
}
const bridge = () => new Bridge(new Map([
  ['c:objc(cs)NSCache', { usr: 'c:objc(cs)NSCache', module: 'Foundation', path: ['NSCache'],
    kind: 'class', genericParameters: ['KeyType', 'ObjectType'] }],
]))

describe('imported class-only generic bounds', () => {
  it('uses a class witness when only declaration fragments carry the bounds', () => {
    const b = bridge()
    const declaration = owner('where KeyType : AnyObject, ObjectType : Swift.AnyObject')
    const generics = b.generics(initializer, declaration)
    for (const name of ['KeyType', 'ObjectType']) {
      expect(generics.resolved.get(name)).toMatchObject({ name: 'Foundation.NSObject' })
      expect(generics.classes.has(name)).toBe(true)
    }
    const graph: Graph = { module: 'Foundation', symbols: [declaration, initializer],
      relationships: [{ kind: 'memberOf', source: initializer.identifier.precise, target: declaration.identifier.precise }] }
    const output = emitModule(graph, b, new Map())
    expect(output.entries).toHaveLength(1)
    expect(output.entries[0].receiver).toMatchObject({ args: [
      { name: 'Foundation.NSObject' }, { name: 'Foundation.NSObject' },
    ] })
  })

  it('keeps structured requirements while adding an imported class bound', () => {
    const b = bridge()
    const declaration = owner('where KeyType: AnyObject', [
      { kind: 'conformance', lhs: 'KeyType', rhs: 'NSCopying', rhsPrecise: 'c:objc(pl)NSCopying' },
    ])
    // NSObject is not a canonical NSCopying witness. retain the constraint
    // instead of opening an entry the native compiler cannot implement.
    expect(b.generics(initializer, declaration).resolved.has('KeyType')).toBe(false)
  })

  it('does not invent class bounds from unrelated or unconstrained declarations', () => {
    const b = bridge()
    const generics = b.generics(initializer, owner('where OtherType: AnyObject'))
    expect(generics.resolved.get('KeyType')).toMatchObject({ name: 'Any' })
    expect(generics.classes.has('KeyType')).toBe(false)
  })
})
