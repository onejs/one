import { describe, expect, it, vi } from 'vitest'
import { Bridge, judge } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import type { Fragment, Graph, Symbol } from '../codegen/sdk/graph'

vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return { ...original, loadGraph: () => null }
})

const CF_ERROR = 'c:@T@CFErrorRef'

const param = (name: string, fragments: Fragment[]) => ({
  name,
  declarationFragments: fragments,
})

const errorParamFragments = (pointee: string, usr?: string): Fragment[] => [
  { kind: 'identifier', spelling: 'error' },
  { kind: 'text', spelling: ': ' },
  { kind: 'typeIdentifier', spelling: 'UnsafeMutablePointer', preciseIdentifier: 's:Sp' },
  { kind: 'text', spelling: '<' },
  { kind: 'typeIdentifier', spelling: 'Unmanaged', preciseIdentifier: 's:s9UnmanagedV' },
  { kind: 'text', spelling: '<' },
  { kind: 'typeIdentifier', spelling: pointee, preciseIdentifier: usr },
  { kind: 'text', spelling: '>?>?' },
]

const funcSymbol = (pointee: string, usr?: string): Symbol => ({
  kind: { identifier: 'swift.func' },
  identifier: { precise: `test.func.TestErrorFunc.${pointee}` },
  pathComponents: ['TestErrorFunc(_:_:)'],
  names: { title: 'TestErrorFunc(_:_:)' },
  accessLevel: 'public',
  declarationFragments: [
    { kind: 'keyword', spelling: 'func' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: 'TestErrorFunc' },
    { kind: 'text', spelling: `(_ value: Int, _ error: UnsafeMutablePointer<Unmanaged<${pointee}>?>?) -> Bool` },
  ],
  functionSignature: {
    parameters: [
      param('value', [
        { kind: 'identifier', spelling: 'value' },
        { kind: 'text', spelling: ': ' },
        { kind: 'typeIdentifier', spelling: 'Int', preciseIdentifier: 's:Si' },
      ]),
      param('error', errorParamFragments(pointee, usr)),
    ],
    returns: [{ kind: 'typeIdentifier', spelling: 'Bool', preciseIdentifier: 's:Sb' }],
  },
})

const bridgeWithCFError = () => {
  const bridge = new Bridge(
    new Map([
      [CF_ERROR, { usr: CF_ERROR, module: 'CoreFoundation', path: ['CFError'], kind: 'class' }],
    ])
  )
  return bridge
}

describe('c error out-parameters', () => {
  it('covers an Unmanaged<CFError> out-parameter', () => {
    const bridge = bridgeWithCFError()
    expect(judge(bridge, funcSymbol('CFError', CF_ERROR), undefined)).toEqual({ covered: true })
  })

  it('still blocks other Unmanaged pointees', () => {
    const bridge = bridgeWithCFError()
    const verdict = judge(bridge, funcSymbol('CFArray', 'c:@T@CFArrayRef'), undefined)
    expect(verdict).toEqual({ covered: false, reason: 'pointer out-parameter' })
  })

  it('emits swift that takes the retained error', () => {
    const bridge = bridgeWithCFError()
    const symbol = funcSymbol('CFError', CF_ERROR)
    const graph: Graph = { module: 'TestModule', symbols: [symbol], relationships: [] }
    const output = emitModule(graph, bridge, new Map())
    expect(output.entries).toHaveLength(1)
    expect(output.entries[0].params).toHaveLength(2)
    expect(output.entries[0].params[1].out).toBe(true)
    expect(output.swift).toContain('takeRetainedValue()')
  })
})
