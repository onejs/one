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

  it('separates zero-argument and value overloads without choosing one', () => {
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
    ).toEqual([
      { name: 'exampleWithBool', sdkName: 'example', module: 'SwiftUICore', kind: 'boolean', type: 'Swift.Bool', ios: 0 },
      { name: 'exampleWithNoArguments', sdkName: 'example', module: 'SwiftUICore', kind: 'boolean', type: '', ios: 0, zeroArgument: true },
    ])
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

  it('derives Text values and labeled scalars without guessing between overloads', () => {
    expect(deriveModifiers([
      method('accessibilityLabel', 'SwiftUI', [{ label: '_', name: 'label', type: 'SwiftUICore.Text' }]),
      method('statusBar', 'SwiftUI', [{ label: 'hidden', name: 'hidden', type: 'Swift.Bool' }]),
      method('accessibility', 'SwiftUI', [{ label: 'hidden', name: 'hidden', type: 'Swift.Bool' }]),
      method('accessibility', 'SwiftUI', [{ label: 'value', name: 'value', type: 'SwiftUICore.Text' }]),
    ], 27, [])).toEqual([
      { name: 'accessibilityLabel', kind: 'string', type: 'SwiftUICore.Text', ios: 0 },
      { name: 'accessibilityWithHidden', sdkName: 'accessibility', module: 'SwiftUI', kind: 'boolean', type: 'Swift.Bool', ios: 0, label: 'hidden' },
      { name: 'accessibilityWithValue', sdkName: 'accessibility', module: 'SwiftUI', kind: 'string', type: 'SwiftUICore.Text', ios: 0, label: 'value' },
      { name: 'statusBar', kind: 'boolean', type: 'Swift.Bool', ios: 0, label: 'hidden' },
    ])
  })

  it('keeps optional scalar and Text values distinct from a missing prop', () => {
    expect(deriveModifiers([
      method('lineLimit', 'SwiftUICore', [{ label: '_', name: 'limit', type: 'Swift.Int?' }]),
      method('sectionIndexLabel', 'SwiftUI', [{ label: '_', name: 'label', type: 'SwiftUICore.Text?' }]),
      method('disableAutocorrection', 'SwiftUI', [{ label: '_', name: 'enabled', type: 'Swift.Bool?' }]),
    ], 27, [])).toEqual([
      { name: 'disableAutocorrection', kind: 'optionalBoolean', type: 'Swift.Bool?', ios: 0 },
      { name: 'lineLimit', kind: 'optionalNumber', type: 'Swift.Int?', ios: 0 },
      { name: 'sectionIndexLabel', kind: 'optionalString', type: 'SwiftUICore.Text?', ios: 0 },
    ])
  })

  it('derives optional SDK cases and framework overlay modifiers', () => {
    expect(deriveModifiers([
      method('textCase', 'SwiftUICore', [{ label: '_', name: 'textCase', type: 'SwiftUICore.Text.Case?' }]),
      { ...method('uppercase', 'SwiftUICore'), kind: 'static', owner: 'Text.Case', type: 'Case' },
      method('truncationMode', 'SwiftUICore', [{ label: '_', name: 'mode', type: 'SwiftUICore.Text.TruncationMode' }]),
      { ...method('tail', 'SwiftUICore'), kind: 'static', owner: 'Text.TruncationMode', type: 'TruncationMode' },
      method('payLaterViewAction', '_PassKit_SwiftUI', [{ label: '_', name: 'action', type: '_PassKit_SwiftUI.PayLaterViewAction' }]),
      { ...method('learnMore', '_PassKit_SwiftUI'), kind: 'static', owner: 'PayLaterViewAction', type: 'PayLaterViewAction' },
    ], 27, [])).toEqual([
      { name: 'payLaterViewAction', kind: 'string', type: '_PassKit_SwiftUI.PayLaterViewAction', ios: 0, framework: 'PassKit', cases: [{ name: 'learnMore', ios: 0 }] },
      { name: 'textCase', kind: 'optionalEnum', type: 'SwiftUICore.Text.Case?', ios: 0, cases: [{ name: 'uppercase', ios: 0 }] },
      { name: 'truncationMode', kind: 'string', type: 'SwiftUICore.Text.TruncationMode', ios: 0, cases: [{ name: 'tail', ios: 0 }] },
    ])
  })

  it('derives scalar callback payloads through the event transport', () => {
    expect(deriveModifiers([
      method('onHover', 'SwiftUI', [{ label: 'perform', name: 'action', type: '@escaping (Swift.Bool) -> Swift.Void' }]),
      method('onOpenURL', 'SwiftUI', [{ label: 'perform', name: 'action', type: '@escaping (Foundation.URL) -> ()' }]),
      method('onScrollVisibilityChange', 'SwiftUI', [
        { label: 'threshold', name: 'threshold', type: 'Swift.Double', defaultValue: '0.5' },
        { label: '_', name: 'action', type: '@escaping (Swift.Bool) -> Swift.Void' },
      ]),
    ], 27, [])).toEqual([
      { name: 'onHover', kind: 'eventBoolean', type: '@escaping (Swift.Bool) -> Swift.Void', ios: 0, label: 'perform' },
      { name: 'onOpenURL', kind: 'eventString', type: '@escaping (Foundation.URL) -> ()', ios: 0, label: 'perform' },
      { name: 'onScrollVisibilityChange', kind: 'eventBoolean', type: '@escaping (Swift.Bool) -> Swift.Void', ios: 0, label: '_', callArguments: [
        { label: 'threshold', defaultValue: '0.5' }, { label: '_', bridge: true },
      ] },
    ])
  })

  it('gives bridgeable overloads distinct props while retaining their SDK calls', () => {
    expect(deriveModifiers([
      method('onOpenURL', 'SwiftUI', [{ label: 'perform', name: 'action', type: '@escaping (Foundation.URL) -> ()' }]),
      method('onOpenURL', 'SwiftUICore', [{ label: 'prefersInApp', name: 'prefersInApp', type: 'Swift.Bool' }]),
    ], 27, [])).toEqual([
      { name: 'onOpenURLWithPerform', sdkName: 'onOpenURL', module: 'SwiftUI', kind: 'eventString', type: '@escaping (Foundation.URL) -> ()', ios: 0, label: 'perform' },
      { name: 'onOpenURLWithPrefersInApp', sdkName: 'onOpenURL', module: 'SwiftUICore', kind: 'boolean', type: 'Swift.Bool', ios: 0, label: 'prefersInApp' },
    ])
  })

  it('derives a typed object for multi-argument scalar and SDK case calls', () => {
    expect(deriveModifiers([
      method('offset', 'SwiftUICore', [
        { label: 'x', name: 'x', type: 'CoreFoundation.CGFloat' },
        { label: 'y', name: 'y', type: 'CoreFoundation.CGFloat' },
      ]),
      method('toolbarVisibility', 'SwiftUI', [
        { label: '_', name: 'visibility', type: 'SwiftUICore.Visibility' },
        { label: 'for', name: 'placement', type: 'SwiftUI.ToolbarPlacement' },
      ]),
      { ...method('visible', 'SwiftUICore'), kind: 'static', owner: 'Visibility', type: 'Visibility' },
      { ...method('navigationBar', 'SwiftUI'), kind: 'static', owner: 'ToolbarPlacement', type: 'ToolbarPlacement' },
    ], 27, [])).toEqual([
      { name: 'offset', kind: 'record', type: '', ios: 0, arguments: [
        { field: 'x', label: 'x', kind: 'number', type: 'CoreFoundation.CGFloat', optional: false },
        { field: 'y', label: 'y', kind: 'number', type: 'CoreFoundation.CGFloat', optional: false },
      ] },
      { name: 'toolbarVisibility', kind: 'record', type: '', ios: 0, arguments: [
        { field: 'visibility', label: '_', kind: 'enum', type: 'SwiftUICore.Visibility', optional: false, cases: [{ name: 'visible', ios: 0 }] },
        { field: 'placement', label: 'for', kind: 'enum', type: 'SwiftUI.ToolbarPlacement', optional: false, cases: [{ name: 'navigationBar', ios: 0 }] },
      ] },
    ])
  })

  it('derives generic style cases through their protocol Self constraints', () => {
    expect(deriveModifiers([
      { ...method('menuStyle', 'SwiftUI', [{ label: '_', name: 'style', type: 'S' }]), requirements: ['S : SwiftUI.MenuStyle'] },
      { ...method('automatic', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.MenuStyle', type: 'SwiftUI.DefaultMenuStyle', requirements: ['Self == SwiftUI.DefaultMenuStyle'] },
      { ...method('button', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.MenuStyle', type: 'SwiftUI.ButtonMenuStyle', requirements: ['Self == SwiftUI.ButtonMenuStyle'] },
    ], 27, [])).toEqual([
      { name: 'menuStyle', kind: 'style', type: 'S', ios: 0, cases: [
        { name: 'automatic', ios: 0 }, { name: 'button', ios: 0 },
      ] },
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
