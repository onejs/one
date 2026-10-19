import { describe, expect, it, vi } from 'vitest'
import { checkInheritedInits, type ClangRunner } from '../codegen/sdk/inherited-inits'
import type { Graph, Symbol } from '../codegen/sdk/graph'

const cls = (usr: string, name: string): Symbol => ({
  kind: { identifier: 'swift.class' },
  identifier: { precise: usr },
  pathComponents: [name],
  names: { title: name },
  accessLevel: 'open',
})

const init = (usr: string, name: string, synthesizedInit?: true): Symbol => ({
  kind: { identifier: 'swift.init' },
  identifier: { precise: usr },
  pathComponents: [name, 'init()'],
  names: { title: 'init()' },
  accessLevel: 'open',
  ...(synthesizedInit ? { synthesizedInit: true as const } : {}),
})

const graphWith = (symbols: Symbol[], pairs: [string, string][]): Graph => ({
  module: 'Contacts',
  symbols,
  relationships: pairs.map(([source, target]) => ({ kind: 'memberOf', source, target })),
})

const OWNER = 'c:objc(cs)TestLabeled'
const SYNTH = `${OWNER}(im)init`
const CUSTOM = `${OWNER}(im)initWithLabel:value:`

describe('checkInheritedInits', () => {
  it('keeps a pure-inheritance init clang accepts', () => {
    const graph = graphWith([cls(OWNER, 'TestLabeled'), init(SYNTH, 'TestLabeled', true)], [[SYNTH, OWNER]])
    let source = ''
    const runner: ClangRunner = (_args, src) => { source = src; return { status: 0, stderr: '' } }
    expect(checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' }).size).toBe(0)
    expect(source).toContain('@import Contacts;')
    expect(source).toContain('[[TestLabeled alloc] init]')
  })

  it('probes the objective-c name when swift drops the prefix', () => {
    const ns = 'c:objc(cs)NSMassFormatter'
    const graph = graphWith(
      [cls(ns, 'MassFormatter'), init(`${ns}(im)init`, 'MassFormatter', true)],
      [[`${ns}(im)init`, ns]],
    )
    let source = ''
    const runner: ClangRunner = (_args, src) => { source = src; return { status: 0, stderr: '' } }
    expect(checkInheritedInits('Foundation', graph, { runner, sdk: '/mock' }).size).toBe(0)
    expect(source).toContain('[[NSMassFormatter alloc] init]')
  })

  it('rejects an init clang marks unavailable', () => {
    const graph = graphWith([cls(OWNER, 'TestLabeled'), init(SYNTH, 'TestLabeled', true)], [[SYNTH, OWNER]])
    const runner: ClangRunner = () => ({ status: 1, stderr: `one-sdk-init-0:2:19: error: 'init' is unavailable\n` })
    const rejected = checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' })
    expect(rejected.get(SYNTH)).toContain('unavailable')
  })

  it('omits a custom-init class as cannot-prove without probing', () => {
    const runner = vi.fn<ClangRunner>(() => ({ status: 0, stderr: '' }))
    const graph = graphWith(
      [cls(OWNER, 'TestLabeled'), init(SYNTH, 'TestLabeled', true), init(CUSTOM, 'TestLabeled')],
      [[SYNTH, OWNER], [CUSTOM, OWNER]],
    )
    const rejected = checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' })
    expect(rejected.get(SYNTH)).toContain('cannot prove legal')
    expect(runner).not.toHaveBeenCalled()
  })

  it('keeps natively proven controls despite custom inits', () => {
    const proven = 'c:objc(cs)NSMapTable'
    const graph = graphWith(
      [cls(proven, 'NSMapTable'), init(`${proven}(im)init`, 'NSMapTable', true), init(`${proven}(im)initWithKeyOptions:valueOptions:capacity:`, 'NSMapTable')],
      [[`${proven}(im)init`, proven], [`${proven}(im)initWithKeyOptions:valueOptions:capacity:`, proven]],
    )
    const runner = vi.fn<ClangRunner>(() => ({ status: 0, stderr: '' }))
    expect(checkInheritedInits('Foundation', graph, { runner, sdk: '/mock' }).size).toBe(0)
    expect(runner).toHaveBeenCalledTimes(1)
  })

  it('fails loudly on an unexplained compiler error', () => {
    const graph = graphWith([cls(OWNER, 'TestLabeled'), init(SYNTH, 'TestLabeled', true)], [[SYNTH, OWNER]])
    const runner: ClangRunner = () => ({ status: 1, stderr: `one-sdk-init-0:2:19: error: unknown type name 'TestLabeled'\n` })
    expect(() => checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' })).toThrow('unexplained')
  })

  it('fails loudly when a probe fails without errors', () => {
    const graph = graphWith([cls(OWNER, 'TestLabeled'), init(SYNTH, 'TestLabeled', true)], [[SYNTH, OWNER]])
    const runner: ClangRunner = () => ({ status: 1, stderr: 'clang crashed\n' })
    expect(() => checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' })).toThrow('without errors')
  })

  it('fails loudly when a synthesized init has no owner', () => {
    const graph = graphWith([init(SYNTH, 'TestLabeled', true)], [])
    const runner: ClangRunner = () => ({ status: 0, stderr: '' })
    expect(() => checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' })).toThrow('no objective-c owner')
  })

  it('skips the probe when nothing is synthesized', () => {
    const runner = vi.fn<ClangRunner>(() => ({ status: 0, stderr: '' }))
    const graph = graphWith([cls(OWNER, 'TestLabeled')], [])
    expect(checkInheritedInits('Contacts', graph, { runner, sdk: '/mock' }).size).toBe(0)
    expect(runner).not.toHaveBeenCalled()
  })
})
