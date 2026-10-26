import { describe, expect, it, vi } from 'vitest'
import { Bridge, judge, unmanagedReturn } from '../codegen/sdk/bridge'
import { emitModule } from '../codegen/sdk/emit'
import { emitFacade } from '../codegen/sdk/emit-ts'
import type { Fragment, Graph, Symbol } from '../codegen/sdk/graph'
import type { SwiftType } from '../codegen/sdk/types'

vi.mock('../codegen/sdk/graph', async (importOriginal) => {
  const original = await importOriginal<typeof import('../codegen/sdk/graph')>()
  return { ...original, loadGraph: () => null }
})

const CF_DATA = 'c:@T@CFDataRef'

const unmanagedData: SwiftType = {
  k: 'optional',
  t: { k: 'named', name: 'Unmanaged', args: [{ k: 'named', name: 'CFData', usr: CF_DATA, args: [] }] },
  implicit: false,
}

const funcSymbol = (base: string): Symbol => ({
  kind: { identifier: 'swift.func' },
  identifier: { precise: `test.func.${base}` },
  pathComponents: [`${base}()`],
  names: { title: `${base}()` },
  accessLevel: 'public',
  declarationFragments: [
    { kind: 'keyword', spelling: 'func' },
    { kind: 'text', spelling: ' ' },
    { kind: 'identifier', spelling: base },
    { kind: 'text', spelling: '() -> Unmanaged<CFData>?' },
  ],
  functionSignature: {
    parameters: [],
    returns: [
      { kind: 'typeIdentifier', spelling: 'Unmanaged' },
      { kind: 'text', spelling: '<' },
      { kind: 'typeIdentifier', spelling: 'CFData', preciseIdentifier: CF_DATA },
      { kind: 'text', spelling: '>?' },
    ],
  },
})

const bridgeWithCFData = () => {
  const bridge = new Bridge(
    new Map([
      [CF_DATA, { usr: CF_DATA, module: 'CoreFoundation', path: ['CFData'], kind: 'class' }],
    ])
  )
  return bridge
}

const emit = (base: string) => {
  const bridge = bridgeWithCFData()
  const graph: Graph = { module: 'TestModule', symbols: [funcSymbol(base)], relationships: [] }
  const output = emitModule(graph, bridge, new Map())
  const facade = emitFacade(
    { module: 'TestModule', entries: output.entries.map(({ swift, ...e }) => e), skipped: output.skipped },
    bridge
  )
  return { output, facade }
}

describe('unmanaged returns', () => {
  it('takes retained values from Create and Copy', () => {
    expect(unmanagedReturn(unmanagedData, 'TestCreateData')?.retained).toBe(true)
    expect(unmanagedReturn(unmanagedData, 'TestCopyData')?.retained).toBe(true)
  })

  it('takes unretained values from Get', () => {
    expect(unmanagedReturn(unmanagedData, 'TestGetData')?.retained).toBe(false)
  })

  it('leaves other unmanaged returns as handles', () => {
    expect(unmanagedReturn(unmanagedData, 'TestOtherData')).toBeUndefined()
  })

  it('covers all three in judgment', () => {
    const bridge = bridgeWithCFData()
    for (const base of ['TestCreateData', 'TestGetData', 'TestOtherData']) {
      expect(judge(bridge, funcSymbol(base), undefined)).toEqual({ covered: true })
    }
  })

  it('emits retained takes for Create', () => {
    const { output, facade } = emit('TestCreateData')
    expect(output.entries).toHaveLength(1)
    expect(output.swift).toContain('takeRetainedValue()')
    expect(output.swift).not.toContain('takeUnretainedValue()')
    expect(facade).toContain('_CoreFoundation_CFData')
  })

  it('emits unretained takes for Get', () => {
    const { output, facade } = emit('TestGetData')
    expect(output.entries).toHaveLength(1)
    expect(output.swift).toContain('takeUnretainedValue()')
    expect(output.swift).not.toContain('takeRetainedValue()')
    expect(facade).toContain('_CoreFoundation_CFData')
  })

  it('passes other unmanaged returns through', () => {
    const { output, facade } = emit('TestOtherData')
    expect(output.entries).toHaveLength(1)
    expect(output.swift).not.toContain('takeRetainedValue()')
    expect(output.swift).not.toContain('takeUnretainedValue()')
    expect(facade).toContain('SDKHandle')
  })
})
