import { describe, expect, it, vi } from 'vitest'
import { Bridge, judge } from '../codegen/sdk/bridge'
import type { Fragment, Symbol } from '../codegen/sdk/graph'

vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return { ...original, loadGraph: () => null }
})

const OWNER = 'c:objc(cs)TestLabeled'
const WITNESS_A = 'c:objc(cs)TestA'
const WITNESS_B = 'c:objc(cs)TestB'

const bridgeWithWitnesses = () => {
  const bridge = new Bridge(
    new Map([
      [OWNER, { usr: OWNER, module: 'TestModule', path: ['TestLabeled'], kind: 'class',
        genericParameters: ['Value'], objcWitnesses: [WITNESS_A, WITNESS_B] }],
      [WITNESS_A, { usr: WITNESS_A, module: 'TestModule', path: ['TestA'], kind: 'class' }],
      [WITNESS_B, { usr: WITNESS_B, module: 'TestModule', path: ['TestB'], kind: 'class' }],
    ])
  )
  return bridge
}

const ownerSymbol = (): Symbol => ({
  kind: { identifier: 'swift.class' },
  identifier: { precise: OWNER },
  pathComponents: ['TestLabeled'],
  names: { title: 'TestLabeled' },
  accessLevel: 'open',
  declarationFragments: [
    { kind: 'keyword', spelling: 'class' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: 'TestLabeled' },
  ],
  swiftGenerics: { parameters: [{ name: 'Value' }], constraints: [
    { kind: 'conformance', lhs: 'Value', rhs: 'TestProtoA' },
    { kind: 'conformance', lhs: 'Value', rhs: 'TestProtoB' },
  ] },
})

const labelSymbol = (): Symbol => ({
  kind: { identifier: 'swift.property' },
  identifier: { precise: `${OWNER}(py)label` },
  pathComponents: ['TestLabeled', 'label'],
  names: { title: 'label' },
  accessLevel: 'open',
  declarationFragments: [
    { kind: 'keyword', spelling: 'var' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: 'label' },
    { kind: 'text', spelling: ': ' },
    { kind: 'typeIdentifier', spelling: 'String', preciseIdentifier: 's:SS' },
    { kind: 'text', spelling: '? { ' },
    { kind: 'keyword', spelling: 'get' },
    { kind: 'text', spelling: ' }' },
  ],
})

const valueSymbol = (): Symbol => ({
  kind: { identifier: 'swift.property' },
  identifier: { precise: `${OWNER}(py)value` },
  pathComponents: ['TestLabeled', 'value'],
  names: { title: 'value' },
  accessLevel: 'open',
  declarationFragments: [
    { kind: 'keyword', spelling: 'var' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: 'value' },
    { kind: 'text', spelling: ': ' },
    { kind: 'typeIdentifier', spelling: 'Value' },
    { kind: 'text', spelling: ' { ' },
    { kind: 'keyword', spelling: 'get' },
    { kind: 'text', spelling: ' }' },
  ],
})

const initSymbol = (): Symbol => ({
  kind: { identifier: 'swift.init' },
  identifier: { precise: `${OWNER}(im)init` },
  pathComponents: ['TestLabeled', 'init(label:value:)'],
  names: { title: 'init(label:value:)' },
  accessLevel: 'public',
  declarationFragments: [
    { kind: 'keyword', spelling: 'init' },
    { kind: 'text', spelling: '(' },
    { kind: 'externalParam', spelling: 'label' },
    { kind: 'text', spelling: ': ' },
    { kind: 'typeIdentifier', spelling: 'String', preciseIdentifier: 's:SS' },
    { kind: 'text', spelling: '?, ' },
    { kind: 'externalParam', spelling: 'value' },
    { kind: 'text', spelling: ': ' },
    { kind: 'typeIdentifier', spelling: 'Value' },
    { kind: 'text', spelling: ')' },
  ],
  functionSignature: {
    parameters: [
      { name: 'label', declarationFragments: [
        { kind: 'identifier', spelling: 'label' },
        { kind: 'text', spelling: ': ' },
        { kind: 'typeIdentifier', spelling: 'String', preciseIdentifier: 's:SS' },
        { kind: 'text', spelling: '?' },
      ] },
      { name: 'value', declarationFragments: [
        { kind: 'identifier', spelling: 'value' },
        { kind: 'text', spelling: ': ' },
        { kind: 'typeIdentifier', spelling: 'Value' },
      ] },
    ],
  },
  swiftGenerics: { parameters: [{ name: 'Value' }], constraints: [
    { kind: 'conformance', lhs: 'Value', rhs: 'TestProtoA' },
    { kind: 'conformance', lhs: 'Value', rhs: 'TestProtoB' },
  ] },
})

describe('objc generic owners', () => {
  it('covers generic members with named witnesses', () => {
    const bridge = bridgeWithWitnesses()
    const owner = ownerSymbol()
    for (const symbol of [labelSymbol(), valueSymbol(), initSymbol()]) {
      expect(judge(bridge, symbol, owner)).toEqual({ covered: true })
    }
  })
})
