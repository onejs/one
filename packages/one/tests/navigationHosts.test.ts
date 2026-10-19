import { describe, expect, it } from 'vitest'
import { containerComponents, contentComponents } from '../codegen/emitContainers'
import { emitNavigationHost, validateNavigationHost } from '../codegen/emitNavigation'
import type { Declaration } from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'SwiftUI.View',
  kind: 'func',
  name: 'toolbar',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

const available16 = ['@available(iOS 16.0, *)']
const available26 = ['@available(iOS 26.0, *)']

// the root stack, the ToolbarContent toolbar overload, the four entry
// initializers, plus overload distractors exact matching must skip.
const inventory: Declaration[] = [
  declaration({
    owner: 'NavigationStack',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [{ label: 'root', name: 'root', type: '() -> Root' }],
  }),
  declaration({
    owner: 'NavigationStack',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [
      { label: 'path', name: 'path', type: 'SwiftUICore.Binding<Data>' },
      { label: 'root', name: 'root', type: '() -> Root' },
    ],
  }),
  declaration({
    owner: 'SwiftUICore.View',
    name: 'toolbar',
    attributes: available16,
    parameters: [{ label: 'content', name: 'content', type: '() -> Content' }],
    type: 'some SwiftUICore.View',
    requirements: ['Content : SwiftUI.ToolbarContent'],
  }),
  declaration({
    owner: 'SwiftUICore.View',
    name: 'toolbar',
    attributes: available16,
    parameters: [{ label: 'content', name: 'content', type: '() -> Content' }],
    type: 'some SwiftUICore.View',
    requirements: ['Content : SwiftUICore.View'],
  }),
  declaration({
    owner: 'SwiftUI.ToolbarItem',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [
      { label: 'placement', name: 'placement', type: 'SwiftUI.ToolbarItemPlacement' },
      { label: 'content', name: 'content', type: '() -> Content' },
    ],
  }),
  declaration({
    owner: 'SwiftUI.ToolbarItemGroup',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [
      { label: 'placement', name: 'placement', type: 'SwiftUI.ToolbarItemPlacement' },
      { label: 'content', name: 'content', type: '() -> Content' },
    ],
  }),
  declaration({
    owner: 'SwiftUI.ToolbarItemGroup',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [
      { label: 'placement', name: 'placement', type: 'SwiftUI.ToolbarItemPlacement' },
      { label: 'content', name: 'content', type: '() -> C' },
      { label: 'label', name: 'label', type: '() -> L' },
    ],
  }),
  declaration({
    owner: 'ToolbarSpacer',
    kind: 'init',
    name: 'init',
    attributes: available26,
    parameters: [
      { label: '_', name: 'sizing', type: 'SwiftUI.SpacerSizing' },
      { label: 'placement', name: 'placement', type: 'SwiftUI.ToolbarItemPlacement' },
    ],
  }),
]

const emit = (entries: readonly Declaration[] = inventory) => {
  const outputs = new Map<string, string>()
  emitNavigationHost('', outputs, entries, 17, 27)
  return outputs
}

const rows = () =>
  JSON.parse(JSON.stringify([...containerComponents, ...contentComponents]))

describe('navigation host generation', () => {
  it('keeps the shared toolbar-host protocol and the stack model byte for byte', () => {
    const swift = emit().get('ios/Generated/OneNativeNavigationStackView.swift')!
    expect(swift).toContain('public protocol OneNativeToolbarHost: OneNativeCompositionParent {')
    expect(swift).toContain('func toolbarChanged()')
    expect(swift).toContain('@Published var toolbarEntries: [OneNativeToolbarEntry] = []')
    expect(swift).toContain('@Published var swiftStyle = OneNativeStyle()')
    expect(swift).toContain('func emitSDKEvent(_ name: String, _ value: String) {')
    expect(swift).toContain('if active { onSDKEvent?(name, value) }')
  })

  it('styles the root content inside the stack and renders bar entries from markers', () => {
    const swift = emit().get('ios/Generated/OneNativeNavigationStackView.swift')!
    expect(swift).toContain('NavigationStack {')
    expect(swift).toContain(
      'OneNativeSlot(\n          content: view, mode: .fill, layoutHost: host,'
    )
    expect(swift).toContain('.frame(maxWidth: .infinity, maxHeight: .infinity)')
    expect(swift).toContain('.oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)')
    const styleAt = swift.indexOf('.oneNativeStyle(model.swiftStyle')
    const toolbarAt = swift.indexOf('.toolbar {')
    expect(toolbarAt).toBeGreaterThan(styleAt)
    expect(swift).toContain('ForEach(model.toolbarEntries) { entry in')
    expect(swift).toContain('OneNativeToolbarEntryContent(entry: entry)')
  })

  it('propagates activation into toolbars and tears everything down on reset', () => {
    const swift = emit().get('ios/Generated/OneNativeNavigationStackView.swift')!
    expect(swift).toContain('for toolbar in toolbars { toolbar.propagateActive(next) }')
    expect(swift).toContain('toolbar.composeInto(self)')
    expect(swift).toContain('model.toolbarEntries = toolbars.flatMap(\\.entries)')
    expect(swift).toContain('screenInsets: true')
    expect(swift).toContain('model.active = attached')
    expect(swift).toContain('setActive(attached)')
    expect(swift).toContain('for toolbar in toolbars { toolbar.decompose() }')
    expect(swift).toContain('toolbars.removeAll()')
    expect(swift).toContain('model = OneNativeNavigationStackModel()')
  })

  it('renders entries as ToolbarContent with the labelled-group split and a gated spacer', () => {
    const swift = emit().get('ios/Generated/OneNativeToolbarView.swift')!
    expect(swift).toContain('struct OneNativeToolbarEntryContent: ToolbarContent')
    expect(swift).toContain(
      'ToolbarItem(placement: OneNativeGenerated.toolbarItemPlacement(entry.placement)) {'
    )
    expect(swift).toContain('if entry.label.isEmpty {')
    expect(swift).toContain('ToolbarItemGroup(placement: OneNativeGenerated.toolbarItemPlacement(entry.placement)) {')
    expect(swift).toContain('content: { entry.content ?? AnyView(EmptyView()) },')
    expect(swift).toContain(
      'if entry.systemImage.isEmpty { Text(entry.label) }\n            else { Label(entry.label, systemImage: entry.systemImage) }'
    )
    expect(swift).toContain('if #available(iOS 26.0, *) {')
    expect(swift).toContain('OneNativeGenerated.spacerSizing(entry.sizing),')
    expect(swift).toContain('let id: ObjectIdentifier')
  })

  it('captures markers by identity and refuses bars that own no host', () => {
    const swift = emit().get('ios/Generated/OneNativeToolbarView.swift')!
    expect(swift).toContain('guard let host = parent as? OneNativeToolbarHost else {')
    expect(swift).toContain('Swift.Toolbar must be a direct child of Swift.NavigationStack')
    expect(swift).toContain('marker.setOnEntryChange { [weak self] in self?.entryChanged() }')
    expect(swift).toContain('markers.insert(marker, at: min(index, markers.count))')
    expect(swift).toContain('let index = markers.firstIndex(where: { $0 === child })')
    expect(swift).toContain('marker.setOnEntryChange(nil)')
    expect(swift).toContain('id: ObjectIdentifier(self),')
    expect(swift).toContain('content: compositionContent()')
    expect(swift).toContain('if changed { model.onEntryChange?() }')
  })

  it('emits Fabric glue with kind checks, marker calls and the shared frame path', () => {
    const mm = emit().get('ios/Generated/OneNativeNavigationStackComponentView.mm')!
    expect(mm).toContain('OneNativeNavigationStackContentComponentView.class]')
    expect(mm).toContain('OneNativeToolbarComponentView.class]')
    expect(mm).toContain('[NSException raise:@"OneNativeInvalidChild"')
    expect(mm).toContain('[_stackView mountContent:child onLayout:')
    expect(mm).toContain('[weakContent updateNativeFrame:frame]')
    expect(mm).toContain('[_toolbars removeObjectIdenticalTo:toolbar];')
    expect(mm).toContain('[_stackView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];')
    for (const component of [
      'OneNativeToolbarItem',
      'OneNativeToolbarItemGroup',
      'OneNativeToolbarSpacer',
    ]) {
      expect(mm).toContain(`@implementation ${component}ComponentView {`)
      expect(mm).toContain(`concreteComponentDescriptorProvider<${component}ComponentDescriptor>()`)
      expect(mm).toContain(`_props = std::make_shared<const ${component}Props>();`)
    }
    expect(mm).toContain('OneNativeToolbarItemEventEmitter')
    expect(mm).toContain('OneNativeToolbarItemGroupEventEmitter')
    expect(mm).not.toContain('OneNativeToolbarSpacerEventEmitter')
    expect(mm).toContain('[_markerView configureWithKind:@"item"')
    expect(mm).toContain('[_markerView configureWithKind:@"group"')
    expect(mm).toContain('[_markerView configureWithKind:@"spacer"')
    expect(mm).toContain('placement:RCTNSStringFromString(next.placement)')
    expect(mm).toContain('sizing:RCTNSStringFromString(next.sizing)')
    expect(mm).toContain('label:RCTNSStringFromString(next.label)')
    expect(mm).toContain('self.frame = (CGRect){CGPointZero, self.bounds.size};')
    const header = emit().get('ios/Generated/OneNativeNavigationStackComponentView.h')!
    for (const name of [
      'OneNativeNavigationStackComponentView',
      'OneNativeNavigationStackContentComponentView',
      'OneNativeToolbarComponentView',
      'OneNativeToolbarItemComponentView',
      'OneNativeToolbarItemGroupComponentView',
      'OneNativeToolbarSpacerComponentView',
    ]) {
      expect(header).toContain(`@interface ${name} `)
    }
    expect(header).toContain(
      '@property (nonatomic, readonly, strong) OneNativeToolbarView *toolbarView;'
    )
  })

  it('matches every Fabric call site to the Swift receiver it configures', () => {
    const mm = emit().get('ios/Generated/OneNativeNavigationStackComponentView.mm')!
    const stack = emit().get('ios/Generated/OneNativeNavigationStackView.swift')!
    const toolbar = emit().get('ios/Generated/OneNativeToolbarView.swift')!
    for (const method of [
      'mountContent(_ view: UIView, onLayout:',
      'unmountContent(_ view: UIView)',
      'mountToolbar(_ toolbar: OneNativeToolbarView)',
      'unmountToolbar(_ toolbar: OneNativeToolbarView)',
      'configureStyle(_ style: [String: Any])',
    ]) {
      expect(stack).toContain(`public func ${method}`)
    }
    expect(toolbar).toContain(
      'public func configure(kind: String, placement: String, sizing: String, label: String, systemImage: String)'
    )
    expect(toolbar).toContain('public func setOnEntryChange(_ callback: (() -> Void)?)')
    expect(toolbar).toContain('public func setOnSDKEvent(_ callback: ((String, String) -> Void)?)')
    // the shared configure selector both the mm call sites spell.
    expect(mm.match(/configureWithKind:@".*?"\n    placement:/g)).toHaveLength(3)
    expect(mm).toContain('[_markerView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];')
  })

  it('rejects SDK facts the hosts cannot emit against', () => {
    const withoutRoot = inventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'NavigationStack' &&
          entry.parameters.length === 1
        )
    )
    expect(() => emit(withoutRoot)).toThrow('SDK constructor signature changed: NavigationStack(')
    const withoutContent = inventory.filter(
      (entry) =>
        !(
          entry.name === 'toolbar' &&
          (entry.requirements ?? []).includes('Content : SwiftUI.ToolbarContent')
        )
    )
    expect(() => emit(withoutContent)).toThrow('expected one exact match, found 0')
    const withoutLabelled = inventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'SwiftUI.ToolbarItemGroup' &&
          entry.parameters.length === 3
        )
    )
    expect(() => emit(withoutLabelled)).toThrow('SDK constructor signature changed: ToolbarItemGroup(')
    const withoutSpacer = inventory.filter(
      (entry) => !(entry.kind === 'init' && entry.owner === 'ToolbarSpacer')
    )
    expect(() => emit(withoutSpacer)).toThrow('SDK constructor signature changed: ToolbarSpacer(')
  })

  it('derives the spacer gate from the SDK and rejects newer-than-floor entries', () => {
    const matured = inventory.map((entry) =>
      entry.kind === 'init' && entry.owner === 'ToolbarSpacer'
        ? { ...entry, attributes: ['@available(iOS 16.0, *)'] }
        : entry
    )
    const outputs = emit(matured)
    expect(outputs.get('ios/Generated/OneNativeToolbarView.swift')!).not.toContain('#available')
    const future = inventory.map((entry) =>
      entry.kind === 'init' && entry.owner === 'SwiftUI.ToolbarItem'
        ? { ...entry, attributes: ['@available(iOS 18.0, *)'] }
        : entry
    )
    expect(() => emit(future)).toThrow('ToolbarItem needs iOS 18, past the floor 17')
    const outputs27 = new Map<string, string>()
    expect(() => emitNavigationHost('', outputs27, inventory, 17, 15)).toThrow(
      'ToolbarSpacer needs iOS 26, past the ceiling 15'
    )
  })

  it('rejects a spec surface the glue cannot fill, including type lookalikes', () => {
    const drifted = rows()
    drifted.find((entry: { name: string }) => entry.name === 'OneNativeToolbarItem').props
      .placement = 'stringArray'
    expect(() => validateNavigationHost(inventory, 17, 27, drifted)).toThrow(
      'configure prop placement carries stringArray, not the string the marker reads'
    )
    // the spacer never styles; giving it swiftStyle breaks the contract instead.
    const wronglyStyled = rows()
    ;(wronglyStyled.find((entry: { name: string }) => entry.name === 'OneNativeToolbarSpacer') as { swiftStyle?: boolean })
      .swiftStyle = true
    expect(() => validateNavigationHost(inventory, 17, 27, wronglyStyled)).toThrow(
      'OneNativeToolbarSpacer styles nowhere'
    )
    const reworded = rows()
    reworded.find(
      (entry: { name: string }) => entry.name === 'OneNativeNavigationStack'
    ).events = {}
    expect(() => validateNavigationHost(inventory, 17, 27, reworded)).toThrow(
      'OneNativeNavigationStack must carry the SDK event'
    )
    const contentless = rows().filter(
      (entry: { name: string }) => entry.name !== 'OneNativeNavigationStackContent'
    )
    expect(() => validateNavigationHost(inventory, 17, 27, contentless)).toThrow(
      'components name no OneNativeNavigationStackContent'
    )
  })
})
