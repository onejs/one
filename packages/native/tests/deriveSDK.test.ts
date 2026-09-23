import { describe, expect, it } from 'vitest'
import { deriveModifiers, deriveViewSlots } from '../codegen/deriveSDK'
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

  it('calls SDK defaults when every modifier argument has a default', () => {
    expect(deriveModifiers([
      method('glassEffect', 'SwiftUICore', [
        { label: '_', name: 'glass', type: 'SwiftUICore.Glass', defaultValue: '.regular' },
        { label: 'in', name: 'shape', type: 'some Shape', defaultValue: 'DefaultGlassEffectShape()' },
      ]),
    ], 27, [])).toEqual([
      { name: 'glassEffect', kind: 'boolean', type: '', ios: 0, zeroArgument: true },
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

  it('derives a string backed SDK value from its public raw value initializer', () => {
    expect(deriveModifiers([
      method('previewDevice', 'SwiftUI', [{ label: '_', name: 'device', type: 'SwiftUI.PreviewDevice?' }]),
      { ...method('PreviewDevice', 'SwiftUI'), kind: 'struct', owner: '', inheritedTypes: ['Swift.RawRepresentable'] },
      { ...method('init', 'SwiftUI', [{ label: 'rawValue', name: 'rawValue', type: 'Swift.String' }]), kind: 'init', owner: 'PreviewDevice' },
    ], 27, [])).toEqual([
      { name: 'previewDevice', kind: 'optionalString', type: 'SwiftUI.PreviewDevice?', rawString: true, ios: 0 },
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

  it('omits non-bridgeable SDK defaults from a record call', () => {
    expect(deriveModifiers([
      method('accessibilityCustomContent', 'SwiftUI', [
        { label: '_', name: 'label', type: 'SwiftUICore.Text' },
        { label: '_', name: 'value', type: 'SwiftUICore.Text' },
        { label: 'importance', name: 'importance', type: 'Accessibility.AXCustomContent.Importance', defaultValue: '.default' },
      ]),
    ], 27, [])).toEqual([
      { name: 'accessibilityCustomContent', kind: 'record', type: '', ios: 0, arguments: [
        { field: 'label', label: '_', kind: 'string', type: 'SwiftUICore.Text', optional: false },
        { field: 'value', label: '_', kind: 'string', type: 'SwiftUICore.Text', optional: false },
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

  it('derives opaque protocol parameters from their concrete cases', () => {
    expect(deriveModifiers([
      method('textEditorStyle', 'SwiftUI', [{ label: '_', name: 'style', type: 'some TextEditorStyle' }]),
      { ...method('automatic', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.TextEditorStyle', type: 'SwiftUI.AutomaticTextEditorStyle', requirements: ['Self == SwiftUI.AutomaticTextEditorStyle'] },
      { ...method('plain', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.TextEditorStyle', type: 'SwiftUI.PlainTextEditorStyle', requirements: ['Self == SwiftUI.PlainTextEditorStyle'] },
      method('scrollTargetBehavior', 'SwiftUI', [{ label: '_', name: 'behavior', type: 'some ScrollTargetBehavior' }]),
      { ...method('paging', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.ScrollTargetBehavior', type: 'SwiftUI.PagingScrollTargetBehavior', requirements: ['Self == SwiftUI.PagingScrollTargetBehavior'] },
      method('navigationTransition', 'SwiftUI', [{ label: '_', name: 'transition', type: 'some NavigationTransition' }]),
      { ...method('automatic', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.NavigationTransition', type: 'SwiftUI.AutomaticNavigationTransition', requirements: ['Self == SwiftUI.AutomaticNavigationTransition'] },
    ], 27, [])).toEqual([
      { name: 'navigationTransition', kind: 'style', type: 'some NavigationTransition', ios: 0, cases: [
        { name: 'automatic', ios: 0 },
      ] },
      { name: 'scrollTargetBehavior', kind: 'style', type: 'some ScrollTargetBehavior', ios: 0, cases: [
        { name: 'paging', ios: 0 },
      ] },
      { name: 'textEditorStyle', kind: 'style', type: 'some TextEditorStyle', ios: 0, cases: [
        { name: 'automatic', ios: 0 }, { name: 'plain', ios: 0 },
      ] },
    ])
  })

  it('keeps a concrete overload ahead of an opaque protocol overload', () => {
    expect(deriveModifiers([
      method('defaultHoverEffect', 'SwiftUI', [{ label: '_', name: 'effect', type: 'SwiftUI.HoverEffect?' }]),
      { ...method('automatic', 'SwiftUI'), kind: 'static', owner: 'HoverEffect', type: 'SwiftUI.HoverEffect' },
      method('defaultHoverEffect', 'SwiftUI', [{ label: '_', name: 'effect', type: 'some CustomHoverEffect' }]),
      { ...method('custom', 'SwiftUI'), kind: 'static', owner: 'SwiftUI.CustomHoverEffect', type: 'SwiftUI.MyHoverEffect', requirements: ['Self == SwiftUI.MyHoverEffect'] },
    ], 27, [])).toEqual([
      { name: 'defaultHoverEffect', kind: 'optionalEnum', type: 'SwiftUI.HoverEffect?', ios: 0,
        cases: [{ name: 'automatic', ios: 0 }] },
    ])
  })

  it('instantiates a Hashable SDK value with a JavaScript string', () => {
    expect(deriveModifiers([
      { ...method('id', 'SwiftUICore', [{ label: '_', name: 'id', type: 'ID' }]), requirements: ['ID : Swift.Hashable'] },
      { ...method('tag', 'SwiftUICore', [
        { label: '_', name: 'tag', type: 'V' },
        { label: 'includeOptional', name: 'includeOptional', type: 'Swift.Bool', defaultValue: 'true' },
      ]), requirements: ['V : Swift.Hashable'] },
      { ...method('coordinateSpace', 'SwiftUICore', [{ label: 'name', name: 'name', type: 'T' }]), requirements: ['T : Swift.Hashable'] },
    ], 27, [])).toEqual([
      { name: 'coordinateSpace', kind: 'string', type: 'T', label: 'name', ios: 0 },
      { name: 'id', kind: 'string', type: 'ID', ios: 0 },
      { name: 'tag', kind: 'string', type: 'V', ios: 0 },
    ])
  })

  it('derives URL values and optional empty action callbacks', () => {
    expect(deriveModifiers([
      method('fileDialogDefaultDirectory', 'SwiftUI', [{ label: '_', name: 'url', type: 'Foundation.URL?' }]),
      method('navigationDocument', 'SwiftUI', [{ label: '_', name: 'url', type: 'Foundation.URL' }]),
      method('subscriptionStorePolicyDestination', '_StoreKit_SwiftUI', [
        { label: 'url', name: 'url', type: 'Foundation.URL' },
        { label: 'for', name: 'button', type: '_StoreKit_SwiftUI.SubscriptionStorePolicyKind' },
      ]),
      { ...method('privacyPolicy', '_StoreKit_SwiftUI'), kind: 'static', owner: 'SubscriptionStorePolicyKind', type: '_StoreKit_SwiftUI.SubscriptionStorePolicyKind' },
      method('subscriptionStoreSignInAction', '_StoreKit_SwiftUI', [{ label: '_', name: 'action', type: '(() -> ())?' }]),
    ], 27, [])).toEqual([
      { name: 'fileDialogDefaultDirectory', kind: 'optionalURL', type: 'Foundation.URL?', ios: 0 },
      { name: 'navigationDocument', kind: 'url', type: 'Foundation.URL', ios: 0 },
      { name: 'subscriptionStorePolicyDestination', kind: 'record', type: '', ios: 0, framework: 'StoreKit', arguments: [
        { field: 'url', label: 'url', kind: 'url', type: 'Foundation.URL', optional: false },
        { field: 'button', label: 'for', kind: 'enum', type: '_StoreKit_SwiftUI.SubscriptionStorePolicyKind', optional: false, cases: [{ name: 'privacyPolicy', ios: 0 }] },
      ] },
      { name: 'subscriptionStoreSignInAction', kind: 'event', type: '(() -> ())?', label: '_', ios: 0, framework: 'StoreKit' },
    ])
  })

  it('derives enum callback payloads from SDK cases', () => {
    expect(deriveModifiers([
      method('accessibilityAdjustableAction', 'SwiftUI', [{ label: '_', name: 'handler', type: '@escaping (SwiftUICore.AccessibilityAdjustmentDirection) -> Swift.Void' }]),
      method('onScrollPhaseChange', 'SwiftUI', [{ label: '_', name: 'action', type: '@escaping (_ oldPhase: SwiftUICore.ScrollPhase, _ newPhase: SwiftUICore.ScrollPhase) -> Swift.Void' }]),
      { ...method('increment', 'SwiftUICore'), kind: 'static', owner: 'AccessibilityAdjustmentDirection', type: 'AccessibilityAdjustmentDirection' },
      { ...method('decrement', 'SwiftUICore'), kind: 'static', owner: 'AccessibilityAdjustmentDirection', type: 'AccessibilityAdjustmentDirection' },
      { ...method('idle', 'SwiftUICore'), kind: 'static', owner: 'ScrollPhase', type: 'ScrollPhase' },
      { ...method('tracking', 'SwiftUICore'), kind: 'static', owner: 'ScrollPhase', type: 'ScrollPhase' },
    ], 27, [])).toEqual([
      { name: 'accessibilityAdjustableAction', kind: 'eventEnum', type: '@escaping (SwiftUICore.AccessibilityAdjustmentDirection) -> Swift.Void', ios: 0, label: '_', cases: [{ name: 'increment', ios: 0 }, { name: 'decrement', ios: 0 }] },
      { name: 'onScrollPhaseChange', kind: 'eventEnumPair', type: '@escaping (_ oldPhase: SwiftUICore.ScrollPhase, _ newPhase: SwiftUICore.ScrollPhase) -> Swift.Void', ios: 0, label: '_', cases: [{ name: 'idle', ios: 0 }, { name: 'tracking', ios: 0 }] },
    ])
  })

  it('derives a frozen enum callback with a point payload', () => {
    expect(deriveModifiers([
      method('onContinuousHover', 'SwiftUI', [
        { label: 'perform', name: 'action', type: '@escaping (SwiftUI.HoverPhase) -> Swift.Void' },
      ]),
      { ...method('onContinuousHover', 'SwiftUI', [
        { label: 'coordinateSpace', name: 'coordinateSpace', type: 'some CoordinateSpaceProtocol', defaultValue: '.local' },
        { label: 'perform', name: 'action', type: '@escaping (SwiftUI.HoverPhase) -> Swift.Void' },
      ]), attributes: ['@available(iOS 17.0, *)'] },
      { ...method('HoverPhase', 'SwiftUI'), kind: 'enum', owner: '', attributes: ['@frozen'] },
      { ...method('active', 'SwiftUI', [{ label: '_', name: 'point', type: 'CoreFoundation.CGPoint' }]), kind: 'case', owner: 'HoverPhase', enumCase: true },
      { ...method('ended', 'SwiftUI'), kind: 'static', owner: 'HoverPhase', type: 'HoverPhase', enumCase: true },
    ], 27, [])).toEqual([
      { name: 'onContinuousHover', kind: 'eventAssociatedEnum', type: '@escaping (SwiftUI.HoverPhase) -> Swift.Void',
        ios: 0, label: 'perform', associatedCases: [
          { name: 'active', values: [{ kind: 'point' }] }, { name: 'ended', values: [] },
        ] },
    ])
  })

  it('derives stored SDK fields in a struct callback', () => {
    expect(deriveModifiers([
      method('onPencilDoubleTap', 'SwiftUI', [
        { label: 'perform', name: 'action', type: '@escaping (_ value: SwiftUI.GestureValue) -> Swift.Void' },
      ]),
      { ...method('GestureValue', 'SwiftUI'), kind: 'struct', owner: '' },
      { ...method('location', 'SwiftUI'), kind: 'var', owner: 'GestureValue', type: 'CoreFoundation.CGPoint?', stored: true },
      { ...method('direction', 'SwiftUI'), kind: 'var', owner: 'GestureValue', type: 'SwiftUI.GestureValue.Direction', stored: true },
      { ...method('hashValue', 'SwiftUI'), kind: 'var', owner: 'GestureValue', type: 'Swift.Int', stored: false },
      { ...method('Direction', 'SwiftUI'), kind: 'enum', owner: 'GestureValue', attributes: ['@frozen'] },
      { ...method('zoomIn', 'SwiftUI'), kind: 'static', owner: 'GestureValue.Direction', type: 'SwiftUI.GestureValue.Direction', enumCase: true },
      { ...method('zoomOut', 'SwiftUI'), kind: 'static', owner: 'GestureValue.Direction', type: 'SwiftUI.GestureValue.Direction', enumCase: true },
    ], 27, [])).toEqual([
      { name: 'onPencilDoubleTap', kind: 'eventStruct', type: '@escaping (_ value: SwiftUI.GestureValue) -> Swift.Void',
        ios: 0, label: 'perform', eventValue: { kind: 'object', fields: [
          { name: 'location', value: { kind: 'optional', value: { kind: 'point' } } },
          { name: 'direction', value: { kind: 'enum', cases: ['zoomIn', 'zoomOut'] } },
        ] } },
    ])
  })

  it('constructs numeric SDK structs and named tuples from public signatures', () => {
    expect(deriveModifiers([
      method('rotation3DEffect', 'SwiftUICore', [
        { label: '_', name: 'angle', type: 'SwiftUICore.Angle' },
        { label: 'axis', name: 'axis', type: '(x: CoreFoundation.CGFloat, y: CoreFoundation.CGFloat, z: CoreFoundation.CGFloat)' },
      ]),
      { ...method('Angle', 'SwiftUICore'), kind: 'struct', owner: '' },
      { ...method('radians', 'SwiftUICore'), kind: 'var', owner: 'Angle', type: 'Swift.Double', stored: true },
      { ...method('init', 'SwiftUICore', [{ label: 'radians', name: 'radians', type: 'Swift.Double' }]), kind: 'init', owner: 'Angle' },
      { ...method('init', 'SwiftUICore', [{ label: 'degrees', name: 'degrees', type: 'Swift.Double' }]), kind: 'init', owner: 'Angle' },
    ], 27, [])).toEqual([{ name: 'rotation3DEffect', kind: 'record', type: '', ios: 0, arguments: [
      { field: 'angle', label: '_', kind: 'numericStruct', type: 'SwiftUICore.Angle', optional: false,
        fields: [{ name: 'radians', label: 'radians', type: 'Swift.Double' }] },
      { field: 'axis', label: 'axis', kind: 'numericTuple', type: '(x: CoreFoundation.CGFloat, y: CoreFoundation.CGFloat, z: CoreFoundation.CGFloat)', optional: false,
        fields: [
          { name: 'x', label: 'x', type: 'CoreFoundation.CGFloat' },
          { name: 'y', label: 'y', type: 'CoreFoundation.CGFloat' },
          { name: 'z', label: 'z', type: 'CoreFoundation.CGFloat' },
        ] },
    ] }])
  })
})

describe('SDK view slots', () => {
  it('derives a direct generic View argument as a child slot', () => {
    expect(deriveViewSlots([
      { ...method('listRowBackground', 'SwiftUI', [{ label: '_', name: 'view', type: 'V?' }]), requirements: ['V : SwiftUICore.View'] },
      { ...method('navigationBarItems', 'SwiftUI', [{ label: 'leading', name: 'leading', type: 'L' }]), requirements: ['L : SwiftUICore.View'] },
      { ...method('navigationBarItems', 'SwiftUI', [{ label: 'trailing', name: 'trailing', type: 'T' }]), requirements: ['T : SwiftUICore.View'] },
      { ...method('background', 'SwiftUICore', [{ label: '_', name: 'view', type: 'V' }]), requirements: ['V : SwiftUICore.View'] },
      { ...method('background', 'SwiftUICore', [{ label: 'content', name: 'content', type: '() -> V' }]), requirements: ['V : SwiftUICore.View'] },
    ], 27)).toEqual([
      { name: 'background', module: 'SwiftUICore', label: 'content', ios: 0, arguments: [] },
      { name: 'listRowBackground', module: 'SwiftUI', label: '_', ios: 0, directValue: true, arguments: [] },
      { name: 'navigationBarItemsWithLeading', sdkName: 'navigationBarItems', module: 'SwiftUI', label: 'leading', ios: 0, directValue: true, arguments: [] },
      { name: 'navigationBarItemsWithTrailing', sdkName: 'navigationBarItems', module: 'SwiftUI', label: 'trailing', ios: 0, directValue: true, arguments: [] },
    ])
  })

  it('selects one child ViewBuilder overload with its parameter label', () => {
    const content = { label: 'content', name: 'content', type: '() -> Content' }
    const requirement = ['Content : SwiftUICore.View']
    expect(deriveViewSlots([
      { ...method('tabViewBottomAccessory', 'SwiftUI', [content]), requirements: requirement },
      { ...method('tabViewBottomAccessory', 'SwiftUI', [
        { label: 'isEnabled', name: 'isEnabled', type: 'Swift.Bool' }, content,
      ]), requirements: requirement },
      { ...method('tabViewSidebarHeader', 'SwiftUI', [content]), requirements: requirement },
      { ...method('searchSuggestions', 'SwiftUI', [{ label: '_', name: 'content', type: '() -> Content' }]), requirements: requirement },
      { ...method('accessibilityChildren', 'SwiftUI', [{ label: 'children', name: 'children', type: '() -> Content' }]), requirements: requirement },
      { ...method('swipeActions', 'SwiftUI', [
        { label: 'edge', name: 'edge', type: 'SwiftUICore.HorizontalEdge', defaultValue: '.trailing' },
        { label: 'allowsFullSwipe', name: 'allowsFullSwipe', type: 'Swift.Bool', defaultValue: 'true' },
        content,
      ]), requirements: requirement },
      { ...method('contentToolbar', 'SwiftUI', [
        { label: 'for', name: 'placement', type: 'SwiftUI.ContentToolbarPlacement' }, content,
      ]), requirements: requirement },
      { ...method('placement', 'SwiftUI'), kind: 'static', owner: 'ContentToolbarPlacement', type: 'SwiftUI.ContentToolbarPlacement' },
    ], 27)).toEqual([
      { name: 'accessibilityChildren', module: 'SwiftUI', label: 'children', ios: 0, arguments: [] },
      { name: 'contentToolbar', module: 'SwiftUI', label: 'content', ios: 0, arguments: [{ field: 'placement', label: 'for', type: 'SwiftUI.ContentToolbarPlacement', kind: 'enum', optional: false, cases: [{ name: 'placement', ios: 0 }] }] },
      { name: 'searchSuggestions', module: 'SwiftUI', label: '_', ios: 0, arguments: [] },
      { name: 'swipeActions', module: 'SwiftUI', label: 'content', ios: 0, arguments: [] },
      { name: 'tabViewBottomAccessory', module: 'SwiftUI', label: 'content', ios: 0, arguments: [] },
      { name: 'tabViewBottomAccessoryWithBool', sdkName: 'tabViewBottomAccessory', module: 'SwiftUI', label: 'content', ios: 0, arguments: [
        { field: 'isEnabled', label: 'isEnabled', type: 'Swift.Bool', kind: 'boolean', optional: false },
      ] },
      { name: 'tabViewSidebarHeader', module: 'SwiftUI', label: 'content', ios: 0, arguments: [] },
    ])
  })

  it('keeps overloads with different required enum types', () => {
    const content = { label: 'content', name: 'content', type: '() -> V' }
    const requirements = ['V : SwiftUICore.View']
    expect(deriveViewSlots([
      { ...method('safeAreaInset', 'SwiftUICore', [
        { label: 'edge', name: 'edge', type: 'SwiftUICore.VerticalEdge' }, content,
      ]), requirements },
      { ...method('safeAreaInset', 'SwiftUICore', [
        { label: 'edge', name: 'edge', type: 'SwiftUICore.HorizontalEdge' }, content,
      ]), requirements },
      { ...method('top', 'SwiftUICore'), kind: 'static', owner: 'VerticalEdge', type: 'VerticalEdge' },
      { ...method('leading', 'SwiftUICore'), kind: 'static', owner: 'HorizontalEdge', type: 'HorizontalEdge' },
    ], 27)).toEqual([
      { name: 'safeAreaInsetWithHorizontalEdge', sdkName: 'safeAreaInset', module: 'SwiftUICore', label: 'content', ios: 0, arguments: [{ field: 'edge', label: 'edge', type: 'SwiftUICore.HorizontalEdge', kind: 'enum', optional: false, cases: [{ name: 'leading', ios: 0 }] }] },
      { name: 'safeAreaInsetWithVerticalEdge', sdkName: 'safeAreaInset', module: 'SwiftUICore', label: 'content', ios: 0, arguments: [{ field: 'edge', label: 'edge', type: 'SwiftUICore.VerticalEdge', kind: 'enum', optional: false, cases: [{ name: 'top', ios: 0 }] }] },
    ])
  })

  it('derives a boolean binding beside a view builder', () => {
    expect(deriveViewSlots([{
      ...method('inspector', 'SwiftUI', [
        { label: 'isPresented', name: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>' },
        { label: 'content', name: 'content', type: '() -> V' },
      ]),
      requirements: ['V : SwiftUICore.View'],
    }], 27)).toEqual([{
      name: 'inspector', module: 'SwiftUI', label: 'content', ios: 0,
      arguments: [{ field: 'isPresented', label: 'isPresented', type: 'SwiftUICore.Binding<Swift.Bool>', kind: 'bindingBoolean', optional: false }],
    }])
  })

  it('derives string and boolean options beside a view builder', () => {
    expect(deriveViewSlots([{
      ...method('dismissalConfirmationDialog', 'SwiftUI', [
        { label: '_', name: 'title', type: 'SwiftUICore.Text' },
        { label: 'shouldPresent', name: 'shouldPresent', type: 'Swift.Bool' },
        { label: 'actions', name: 'actions', type: '() -> A' },
      ]),
      requirements: ['A : SwiftUICore.View'],
    }], 27)).toEqual([{
      name: 'dismissalConfirmationDialog', module: 'SwiftUI', label: 'actions', ios: 0,
      arguments: [
        { field: 'title', label: '_', type: 'SwiftUICore.Text', kind: 'string', optional: false },
        { field: 'shouldPresent', label: 'shouldPresent', type: 'Swift.Bool', kind: 'boolean', optional: false },
      ],
    }])
  })

  it('specializes a generic Hashable slot binding to a controlled string', () => {
    expect(deriveViewSlots([
      { ...method('searchScopes', 'SwiftUI', [
        { label: '_', name: 'selection', type: 'SwiftUICore.Binding<V>' },
        { label: 'scopes', name: 'scopes', type: '() -> S' },
      ]), requirements: ['V : Swift.Hashable', 'S : SwiftUICore.View'] },
      { ...method('searchScopes', 'SwiftUI', [
        { label: '_', name: 'selection', type: 'SwiftUICore.Binding<V>' },
        { label: 'activation', name: 'activation', type: 'SwiftUI.SearchScopeActivation' },
        { label: '_', name: 'scopes', type: '() -> S' },
      ]), requirements: ['V : Swift.Hashable', 'S : SwiftUICore.View'] },
      { ...method('automatic', 'SwiftUI'), kind: 'static', owner: 'SearchScopeActivation', type: 'SwiftUI.SearchScopeActivation' },
    ], 27)).toEqual([
      { name: 'searchScopesWithBindingString', sdkName: 'searchScopes', module: 'SwiftUI', label: 'scopes', ios: 0,
        arguments: [{ field: 'selection', label: '_', type: 'SwiftUICore.Binding<V>', kind: 'bindingString', optional: false }] },
      { name: 'searchScopesWithBindingStringAndSearchScopeActivation', sdkName: 'searchScopes', module: 'SwiftUI', label: '_', ios: 0,
        arguments: [
          { field: 'selection', label: '_', type: 'SwiftUICore.Binding<V>', kind: 'bindingString', optional: false },
          { field: 'activation', label: 'activation', type: 'SwiftUI.SearchScopeActivation', kind: 'enum', optional: false, cases: [{ name: 'automatic', ios: 0 }] },
        ] },
    ])
  })
})
