import { describe, expect, it } from 'vitest'
import { containerComponents, contentComponents } from '../codegen/emitContainers'
import {
  emitNavigationHost,
  validateNavigationHost,
  validateNavigationSplitHost,
} from '../codegen/emitNavigation'
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

const emit = (entries: readonly Declaration[] = splitInventory) => {
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
    const withoutRoot = splitInventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'NavigationStack' &&
          entry.parameters.length === 1
        )
    )
    expect(() => emit(withoutRoot)).toThrow('SDK constructor signature changed: NavigationStack(')
    const withoutContent = splitInventory.filter(
      (entry) =>
        !(
          entry.name === 'toolbar' &&
          (entry.requirements ?? []).includes('Content : SwiftUI.ToolbarContent')
        )
    )
    expect(() => emit(withoutContent)).toThrow('expected one exact match, found 0')
    const withoutLabelled = splitInventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'SwiftUI.ToolbarItemGroup' &&
          entry.parameters.length === 3
        )
    )
    expect(() => emit(withoutLabelled)).toThrow('SDK constructor signature changed: ToolbarItemGroup(')
    const withoutSpacer = splitInventory.filter(
      (entry) => !(entry.kind === 'init' && entry.owner === 'ToolbarSpacer')
    )
    expect(() => emit(withoutSpacer)).toThrow('SDK constructor signature changed: ToolbarSpacer(')
  })

  it('derives the spacer gate from the SDK and rejects newer-than-floor entries', () => {
    const matured = splitInventory.map((entry) =>
      entry.kind === 'init' && entry.owner === 'ToolbarSpacer'
        ? { ...entry, attributes: ['@available(iOS 16.0, *)'] }
        : entry
    )
    const outputs = emit(matured)
    expect(outputs.get('ios/Generated/OneNativeToolbarView.swift')!).not.toContain('#available')
    const future = splitInventory.map((entry) =>
      entry.kind === 'init' && entry.owner === 'SwiftUI.ToolbarItem'
        ? { ...entry, attributes: ['@available(iOS 18.0, *)'] }
        : entry
    )
    expect(() => emit(future)).toThrow('ToolbarItem needs iOS 18, past the floor 17')
    const outputs27 = new Map<string, string>()
    expect(() => emitNavigationHost('', outputs27, splitInventory, 17, 15)).toThrow(
      'ToolbarSpacer needs iOS 26, past the ceiling 15'
    )
  })

  it('rejects a spec surface the glue cannot fill, including type lookalikes', () => {
    const drifted = rows()
    drifted.find((entry: { name: string }) => entry.name === 'OneNativeToolbarItem').props
      .placement = 'stringArray'
    expect(() => validateNavigationHost(splitInventory, 17, 27, drifted)).toThrow(
      'configure prop placement carries stringArray, not the string the marker reads'
    )
    // the spacer never styles; giving it swiftStyle breaks the contract instead.
    const wronglyStyled = rows()
    ;(wronglyStyled.find((entry: { name: string }) => entry.name === 'OneNativeToolbarSpacer') as { swiftStyle?: boolean })
      .swiftStyle = true
    expect(() => validateNavigationHost(splitInventory, 17, 27, wronglyStyled)).toThrow(
      'OneNativeToolbarSpacer styles nowhere'
    )
    const reworded = rows()
    reworded.find(
      (entry: { name: string }) => entry.name === 'OneNativeNavigationStack'
    ).events = {}
    expect(() => validateNavigationHost(splitInventory, 17, 27, reworded)).toThrow(
      'OneNativeNavigationStack must carry the SDK event'
    )
    const contentless = rows().filter(
      (entry: { name: string }) => entry.name !== 'OneNativeNavigationStackContent'
    )
    expect(() => validateNavigationHost(splitInventory, 17, 27, contentless)).toThrow(
      'components name no OneNativeNavigationStackContent'
    )
  })
})

const available17 = ['@available(iOS 17.0, *)']

const splitInventory: Declaration[] = [
  ...inventory,
  ...(
    [
      { labels: ['sidebar', 'content', 'detail'], gated: false },
      { labels: ['sidebar', 'detail'], gated: false },
      { labels: ['columnVisibility', 'preferredCompactColumn', 'sidebar', 'content', 'detail'], gated: true },
      { labels: ['columnVisibility', 'preferredCompactColumn', 'sidebar', 'detail'], gated: true },
      { labels: ['columnVisibility', 'sidebar', 'content', 'detail'], gated: false },
      { labels: ['columnVisibility', 'sidebar', 'detail'], gated: false },
    ] as const
  ).map(({ labels, gated }) =>
    declaration({
      owner: 'NavigationSplitView',
      kind: 'init',
      name: 'init',
      attributes: gated ? available17 : available16,
      parameters: labels.map((label) => ({
        label,
        name: label,
        type:
          label === 'columnVisibility'
            ? 'SwiftUICore.Binding<SwiftUI.NavigationSplitViewVisibility>'
            : label === 'preferredCompactColumn'
              ? 'SwiftUICore.Binding<SwiftUI.NavigationSplitViewColumn>'
              : `() -> ${label[0].toUpperCase()}${label.slice(1)}`,
      })),
    })
  ),
  ...(['all', 'doubleColumn', 'detailOnly', 'automatic'] as const).map((name) =>
    declaration({
      owner: 'NavigationSplitViewVisibility',
      kind: 'static',
      name,
      attributes: available16,
      parameters: [],
      type: 'SwiftUI.NavigationSplitViewVisibility',
    })
  ),
  ...(['sidebar', 'content', 'detail'] as const).map((name) =>
    declaration({
      owner: 'NavigationSplitViewColumn',
      kind: 'static',
      name,
      attributes: available17,
      parameters: [],
      type: 'SwiftUI.NavigationSplitViewColumn',
    })
  ),
  declaration({
    owner: 'NavigationSplitViewColumn',
    kind: 'static',
    name: 'inspector',
    attributes: available17,
    parameters: [],
    type: 'SwiftUI.NavigationSplitViewColumn',
  }),
]

const emitSplit = (entries: readonly Declaration[] = splitInventory) => {
  const outputs = new Map<string, string>()
  emitNavigationHost('', outputs, entries, 17, 27)
  return outputs
}

describe('navigation split host generation', () => {
  it('emits the controlled visibility and compact-column bindings with exact converters', () => {
    const swift = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewView.swift')!
    expect(swift).toContain('columnVisibilityIsControlled ? columnVisibility : uncontrolledColumnVisibility')
    expect(swift).toContain('preferredCompactColumnIsControlled ? preferredCompactColumn : uncontrolledCompactColumn')
    expect(swift).toContain('var columnVisibilityBinding: Binding<NavigationSplitViewVisibility> {')
    expect(swift).toContain('var compactColumnBinding: Binding<NavigationSplitViewColumn> {')
    expect(swift).toContain('guard value != currentColumnVisibility else { return }')
    expect(swift).toContain('if !columnVisibilityIsControlled { uncontrolledColumnVisibility = value }')
    expect(swift).toContain('if active { onColumnVisibilityChange?(value) }')
    expect(swift).toContain('if !preferredCompactColumnIsControlled { uncontrolledCompactColumn = value }')
    expect(swift).toContain('if active { onPreferredCompactColumnChange?(value) }')
    for (const member of ['all', 'doubleColumn', 'detailOnly', 'automatic']) {
      expect(swift).toContain(`case "${member}": return .${member}`)
      expect(swift).toContain(`case .${member}: return "${member}"`)
    }
    for (const member of ['sidebar', 'content', 'detail']) {
      expect(swift).toContain(`case "${member}": return .${member}`)
    }
    expect(swift).toContain('default: return .automatic')
    expect(swift).toContain('default: return "automatic"')
    expect(swift).toContain('default: return .sidebar')
    expect(swift).toContain('default: return "sidebar"')
    // the unlisted inspector column never converts: the sender cannot send it.
    expect(swift).not.toContain('inspector')
  })

  it('gates the compact surface on the SDK version with 2/3-column variants', () => {
    const swift = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewView.swift')!
    expect(swift).toContain('if #available(iOS 17.0, *) {')
    expect(swift).toContain('@available(iOS 17.0, *)\n  var compactColumnBinding')
    expect(swift).toContain('@available(iOS 17.0, *)\n  private func compactColumn(')
    expect(swift).toContain('@available(iOS 17.0, *)\n  @ViewBuilder private var splitViewWithCompactColumn')
    expect(swift).toContain('preferredCompactColumn: model.compactColumnBinding')
    expect(swift).toContain('if model.column("content") != nil {')
    expect(swift).toContain('NavigationSplitView(columnVisibility: model.columnVisibilityBinding) {')
  })

  it('styles the split outside and each column with its toolbar inside', () => {
    const swift = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewView.swift')!
    const rootStyle = swift.indexOf('.oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)')
    const columnStyle = swift.indexOf('.oneNativeStyle(column.swiftStyle, emit: column.emitSDKEvent)')
    expect(rootStyle).toBeGreaterThan(-1)
    expect(columnStyle).toBeGreaterThan(-1)
    // column content fills its slot against the split window with its own bar.
    expect(swift).toContain('layoutHost: host,\n          onLayout: { frame in column.updateNativeFrame(frame) }')
    expect(swift).toContain('.toolbar {')
    expect(swift).toContain('ForEach(column.toolbarEntries) { entry in')
    expect(swift).toContain('OneNativeToolbarEntryContent(entry: entry)')
    expect(swift).toContain('fileprivate func updateNativeFrame(_ frame: CGRect) { onLayout?(frame) }')
  })

  it('hosts one toolbar per column with active propagation and full reset', () => {
    const swift = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewView.swift')!
    expect(swift).toContain(
      'public final class OneNativeNavigationSplitViewColumnView: UIView, OneNativeToolbarHost, ObservableObject {'
    )
    expect(swift).toContain('public func refreshRow(for child: UIView) {}')
    expect(swift).toContain('for toolbar in toolbars { toolbar.propagateActive(next) }')
    expect(swift).toContain('guard !model.columns.contains(where: { $0 === column }) else { return }')
    expect(swift).toContain('column.propagateActive(active)')
    expect(swift).toContain('for column in model.columns { column.propagateActive(next) }')
    expect(swift).toContain('controller?.view.frame = bounds')
    expect(swift).toContain('model.uncontrolledColumnVisibility = "automatic"')
    expect(swift).toContain('model.uncontrolledCompactColumn = "sidebar"')
    expect(swift).toContain('columnName = "sidebar"')
  })

  it('emits split Fabric glue with column checks, configure calls and recycle order', () => {
    const mm = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewComponentView.mm')!
    expect(mm).toContain('OneNativeNavigationSplitViewColumnComponentView.class]')
    expect(mm).toContain('Swift.NavigationSplitView takes Sidebar, Content, and Detail column markers.')
    expect(mm).toContain('[_columns insertObject:column atIndex:MIN(index, _columns.count)];')
    expect(mm).toContain('[_splitView mountColumn:column.columnView];')
    expect(mm).toContain('[_splitView configureWithColumnVisibility:RCTNSStringFromString(next.columnVisibility)')
    expect(mm).toContain('columnVisibilityIsControlled:next.columnVisibilityIsControlled')
    expect(mm).toContain('preferredCompactColumnIsControlled:next.preferredCompactColumnIsControlled];')
    expect(mm).toContain('onNativeNavigationSplitViewColumnVisibilityChange({.visibility = std::string(visibility.UTF8String)})')
    expect(mm).toContain('onNativeNavigationSplitViewPreferredCompactColumnChange({.column = std::string(column.UTF8String)})')
    expect(mm).toContain('[_splitView unmountColumn:column.columnView];')
    expect(mm).toContain('[_columns removeAllObjects];\n  [_splitView reset];')
    expect(mm).toContain('Swift.NavigationSplitView column takes one React Native content slot.')
    expect(mm).toContain('Swift.NavigationSplitView column takes one Swift.Toolbar.')
    expect(mm).toContain('[_columnView configureWithColumn:RCTNSStringFromString(next.column)')
    expect(mm).toContain('style:OneNativeStyleDictionary(next.swiftStyle)];')
    const header = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewComponentView.h')!
    expect(header).toContain('#import "OneNativeNavigationStackComponentView.h"')
    expect(header).toContain('@interface OneNativeNavigationSplitViewComponentView : RCTViewComponentView')
    expect(header).toContain('@interface OneNativeNavigationSplitViewColumnComponentView : RCTViewComponentView')
    expect(header).toContain(
      '@property (nonatomic, readonly, strong) OneNativeNavigationSplitViewColumnView *columnView;'
    )
  })

  it('matches every split call site to the Swift receiver it configures', () => {
    const mm = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewComponentView.mm')!
    const swift = emitSplit().get('ios/Generated/OneNativeNavigationSplitViewView.swift')!
    for (const method of [
      'public func configure(\n    columnVisibility: String,',
      'public func configure(column: String, style: [String: Any]) {',
      'public func mountColumn(_ column: OneNativeNavigationSplitViewColumnView) {',
      'public func unmountColumn(_ column: OneNativeNavigationSplitViewColumnView) {',
      'public func configureStyle(_ style: [String: Any]) {',
      'fileprivate func updateNativeFrame(_ frame: CGRect)',
    ]) {
      expect(swift).toContain(method)
    }
    expect(mm).toContain('[_splitView configureWithColumnVisibility:')
    expect(mm).toContain('[_columnView configureWithColumn:')
    expect(mm).toContain('[_splitView mountColumn:column.columnView];')
    expect(mm).toContain('[_columnView mountToolbar:toolbar];')
  })

  it('rejects split SDK facts the hosts cannot emit against', () => {
    const withoutCompact = splitInventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          /NavigationSplitView$/.test(entry.owner) &&
          entry.parameters.some((p) => p.label === 'preferredCompactColumn')
        )
    )
    expect(() => emitSplit(withoutCompact)).toThrow(
      'SDK constructor signature changed: NavigationSplitView('
    )
    const withoutMember = splitInventory.filter(
      (entry) =>
        !(
          /NavigationSplitViewVisibility$/.test(entry.owner) &&
          entry.name === 'doubleColumn'
        )
    )
    expect(() => emitSplit(withoutMember)).toThrow(
      'NavigationSplitViewVisibility has 0 members spelling .doubleColumn'
    )
    const reshaped = splitInventory.map((entry) =>
      /NavigationSplitViewColumn$/.test(entry.owner) && entry.name === 'detail'
        ? { ...entry, type: 'SwiftUI.NavigationSplitViewVisibility' }
        : entry
    )
    expect(() => emitSplit(reshaped)).toThrow(
      'NavigationSplitViewColumn has 0 members spelling .detail'
    )
  })

  it('rejects newer-than-gate members and divergent compact versions', () => {
    const future = splitInventory.map((entry) =>
      /NavigationSplitViewVisibility$/.test(entry.owner) && entry.name === 'all'
        ? { ...entry, attributes: ['@available(iOS 18.0, *)'] }
        : entry
    )
    expect(() => emitSplit(future)).toThrow(
      'NavigationSplitViewVisibility.all needs iOS 18, past 17'
    )
    const divergent = splitInventory.map((entry) =>
      entry.kind === 'init' &&
      /NavigationSplitView$/.test(entry.owner) &&
      entry.parameters.length === 5 &&
      entry.parameters.some((p) => p.label === 'content')
        ? { ...entry, attributes: ['@available(iOS 18.0, *)'] }
        : entry
    )
    expect(() => emitSplit(divergent)).toThrow('the compact initializers ship different versions')
    expect(() => validateNavigationSplitHost(splitInventory, 17, 16)).toThrow(
      'NavigationSplitView needs iOS 17, past the ceiling 16'
    )
  })

  it('rejects a split spec surface the glue cannot fill, including type lookalikes', () => {
    const drifted = rows()
    drifted.find((entry: { name: string }) => entry.name === 'OneNativeNavigationSplitView').props
      .columnVisibility = 'stringArray'
    expect(() => validateNavigationSplitHost(splitInventory, 17, 27, drifted)).toThrow(
      'configure prop columnVisibility carries stringArray, not the string the model reads'
    )
    const reworded = rows()
    reworded.find(
      (entry: { name: string }) => entry.name === 'OneNativeNavigationSplitView'
    ).events.onNativeNavigationSplitViewPreferredCompactColumnChange = { visibility: 'string' }
    expect(() => validateNavigationSplitHost(splitInventory, 17, 27, reworded)).toThrow(
      'onNativeNavigationSplitViewPreferredCompactColumnChange must carry column'
    )
    const styleless = rows()
    delete (
      styleless.find(
        (entry: { name: string }) => entry.name === 'OneNativeNavigationSplitViewColumn'
      ) as { swiftStyle?: boolean }
    ).swiftStyle
    expect(() => validateNavigationSplitHost(splitInventory, 17, 27, styleless)).toThrow(
      'OneNativeNavigationSplitViewColumn styles through swiftStyle'
    )
    const columnless = rows().filter(
      (entry: { name: string }) => entry.name !== 'OneNativeNavigationSplitViewColumn'
    )
    expect(() => validateNavigationSplitHost(splitInventory, 17, 27, columnless)).toThrow(
      'components name no OneNativeNavigationSplitViewColumn'
    )
  })
})
