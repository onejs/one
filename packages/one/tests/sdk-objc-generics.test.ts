import { describe, expect, it, vi } from 'vitest'
import { spawnSync } from 'node:child_process'
import { createRequire } from 'node:module'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { Bridge, judge } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import { emitFacade } from '../codegen/sdk/emit-ts'
import type { Fragment, Graph, Symbol } from '../codegen/sdk/graph'

const graphs = vi.hoisted(() => new Map<string, Graph>())
vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return { ...original, loadGraph: (module: string) => graphs.get(module) ?? null }
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

const graphWith = (symbols: Symbol[]): Graph => ({
  module: 'TestModule',
  symbols: [ownerSymbol(), ...symbols],
  relationships: symbols.map((s) => ({ kind: 'memberOf', source: s.identifier.precise, target: OWNER })),
})

describe('objc generic owners', () => {
  it('covers generic members with named witnesses', () => {
    const bridge = bridgeWithWitnesses()
    const owner = ownerSymbol()
    for (const symbol of [labelSymbol(), valueSymbol(), initSymbol()]) {
      expect(judge(bridge, symbol, owner)).toEqual({ covered: true })
    }
  })

  it('reads through the erasure witness', () => {
    const bridge = bridgeWithWitnesses()
    const output = emitModule(graphWith([labelSymbol(), valueSymbol()]), bridge, new Map())
    expect(output.entries.map((e) => e.name).sort()).toEqual(['label', 'value'])
    // the receiver is erased to the first witness; objective-c generics strip it
    expect(output.swift).toContain('TestModule.TestLabeled<TestModule.TestA>')
    expect(output.swift).not.toContain('oneSDKOpen_')
  })

  it('constructs through a witness switch', () => {
    const bridge = bridgeWithWitnesses()
    const output = emitModule(graphWith([initSymbol()]), bridge, new Map())
    expect(output.entries).toHaveLength(1)
    expect(output.swift).toContain('TestModule.TestA')
    expect(output.swift).toContain('TestModule.TestB')
    expect(output.swift).toContain('badArgument')
  })

  it('keeps the value generic in typescript', () => {
    const bridge = bridgeWithWitnesses()
    const output = emitModule(graphWith([labelSymbol(), valueSymbol(), initSymbol()]), bridge, new Map())
    const facade = emitFacade(
      { module: 'TestModule', entries: output.entries.map(({ swift, ...e }) => e), skipped: output.skipped },
      bridge
    )
    expect(facade).toContain('class TestLabeled<Value = unknown>')
    expect(facade).toContain('get value(): Value')
    expect(facade).toContain('TestA')
    expect(facade).toContain('TestB')
  })

  it('checks native witness identity and normalizes copied subclasses in a consumer', () => {
    const bridge = bridgeWithWitnesses()
    bridge.index.set('c:objc(cs)MutableA', {
      usr: 'c:objc(cs)MutableA', module: 'TestModule', path: ['MutableA'],
      kind: 'class', superclass: WITNESS_A,
    })
    bridge.index.set('c:objc(cs)Unlisted', {
      usr: 'c:objc(cs)Unlisted', module: 'TestModule', path: ['Unlisted'], kind: 'class',
    })
    const graph = graphWith([labelSymbol(), valueSymbol(), initSymbol()])
    const symbol = (usr: string, name: string): Symbol => ({
      kind: { identifier: 'swift.class' }, identifier: { precise: usr },
      pathComponents: [name], names: { title: name }, accessLevel: 'public',
    })
    graph.symbols.push(symbol(WITNESS_A, 'TestA'), symbol(WITNESS_B, 'TestB'),
      symbol('c:objc(cs)MutableA', 'MutableA'), symbol('c:objc(cs)Unlisted', 'Unlisted'))
    graph.relationships.push({ kind: 'inheritsFrom', source: 'c:objc(cs)MutableA', target: WITNESS_A })
    graphs.set('TestModule', graph)
    const dir = mkdtempSync(join(tmpdir(), 'one-objc-consumer-'))
    try {
      const output = emitModule(graph, bridge, new Map())
      writeFileSync(join(dir, 'facade.ts'), emitFacade({
        module: 'TestModule', entries: output.entries.map(({ swift, ...e }) => e), skipped: output.skipped,
      }, bridge))
      writeFileSync(join(dir, 'runtime.d.ts'), `declare module 'one/ios-runtime' {
        export class SDKHandle { constructor(handle: unknown); readonly $handle: unknown; }
        export function callSDK<T>(...args: any[]): T;
        export function callSDKAsync<T>(...args: any[]): Promise<T>;
        export function registerSDKClass(...args: any[]): void;
        export function registerSDKProtocol(...args: any[]): void;
        export type Implements<T> = Partial<T>;
        export type SDKSequence<T> = SDKHandle;
        export type NativeOut<T> = { value: T };
        export type NativeMap<K, V> = Map<K, V>;
        export type NativeError = SDKHandle;
      }`)
      writeFileSync(join(dir, 'consumer.ts'), `import {TestA, TestB, MutableA, Unlisted, TestLabeled} from './facade';
        declare const a: TestA;
        declare const b: TestB;
        declare const mutable: MutableA & { mutate(): void };
        declare const unlisted: Unlisted;
        const first: TestLabeled<TestA> = TestLabeled.init(null, a);
        const second: TestLabeled<TestB> = TestLabeled.init(null, b);
        const copied: TestLabeled<TestA> = TestLabeled.init(null, mutable);
        const parent: TestA = mutable;
        // @ts-expect-error an unlisted handle cannot satisfy a native witness
        TestLabeled.init(null, unlisted);
        // @ts-expect-error native copies normalize subclass-only capabilities
        TestLabeled.init(null, mutable).value.mutate();
        // @ts-expect-error distinct witnesses remain distinct
        const wrong: TestB = first.value;
      `)
      const compiler = join(createRequire(import.meta.url).resolve('typescript/package.json'), '../bin/tsc')
      writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({
        compilerOptions: { strict: true, noEmit: true, target: 'ESNext',
          module: 'ESNext', moduleResolution: 'Bundler', types: [] },
        files: ['./consumer.ts', './runtime.d.ts'],
      }))
      const checked = spawnSync(process.execPath, [compiler, '-p', join(dir, 'tsconfig.json')], { encoding: 'utf8' })
      expect({ status: checked.status, output: checked.stdout + checked.stderr }).toEqual({ status: 0, output: '' })
    } finally {
      graphs.delete('TestModule')
      rmSync(dir, { recursive: true, force: true })
    }
  })
})
