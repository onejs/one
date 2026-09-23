import { describe, expect, it } from 'vitest'
import { deriveModifiers, deriveTabViewSlots } from '../codegen/deriveSDK'
import type { Declaration } from '../codegen/inventory'

const method = (
  name: string,
  module = 'SwiftUICore',
  parameters: Declaration['parameters'] = []
): Declaration => ({
  module,
  owner: 'View',
  kind: 'func',
  name,
  attributes: [],
  parameters,
  requirements: [],
  line: 1,
})

describe('SDK modifier derivation', () => {
  it('derives parameterless View methods as boolean props, including framework overlays', () => {
    expect(
      deriveModifiers(
        [method('hidden'), method('productIconBorder', '_StoreKit_SwiftUI')],
        27,
        []
      )
    ).toEqual([
      { name: 'hidden', kind: 'boolean', type: '', ios: 0, zeroArgument: true },
      {
        name: 'productIconBorder',
        kind: 'boolean',
        type: '',
        ios: 0,
        zeroArgument: true,
        framework: 'StoreKit',
      },
    ])
  })

  it('does not choose a zero-argument overload when another bridgeable overload shares its name', () => {
    expect(
      deriveModifiers(
        [
          method('example'),
          method('example', 'SwiftUICore', [
            { label: '_', name: 'enabled', type: 'Swift.Bool' },
          ]),
        ],
        27,
        []
      )
    ).toEqual([])
  })

  it('derives a void callback and a boolean binding from one generic event contract', () => {
    expect(deriveModifiers([
      method('onAppear', 'SwiftUICore', [{ label: 'perform', name: 'action', type: '(() -> Swift.Void)?' }]),
      method('findNavigator', 'SwiftUI', [{ label: 'isPresented', name: 'value', type: 'SwiftUICore.Binding<Swift.Bool>' }]),
    ], 27, [])).toEqual([
      { name: 'findNavigator', kind: 'bindingBoolean', type: 'SwiftUICore.Binding<Swift.Bool>', ios: 0, label: 'isPresented' },
      { name: 'onAppear', kind: 'event', type: '(() -> Swift.Void)?', ios: 0, label: 'perform' },
    ])
  })
})

describe('SDK tab view slots', () => {
  it('selects one child ViewBuilder overload and leaves multi-argument semantics explicit', () => {
    const content = { label: 'content', name: 'content', type: '() -> Content' }
    const requirement = ['Content : SwiftUICore.View']
    expect(deriveTabViewSlots([
      { ...method('tabViewBottomAccessory', 'SwiftUI', [content]), requirements: requirement },
      { ...method('tabViewBottomAccessory', 'SwiftUI', [
        { label: 'isEnabled', name: 'isEnabled', type: 'Swift.Bool' }, content,
      ]), requirements: requirement },
      { ...method('tabViewSidebarHeader', 'SwiftUI', [content]), requirements: requirement },
    ], 27)).toEqual([
      { name: 'tabViewBottomAccessory', ios: 0 },
      { name: 'tabViewSidebarHeader', ios: 0 },
    ])
  })
})
