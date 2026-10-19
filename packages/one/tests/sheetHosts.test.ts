import { describe, expect, it } from 'vitest'
import { emitSheet, sheetComponents, validateSheetHost } from '../codegen/emitSheet'
import type { Declaration } from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'SwiftUI.View',
  kind: 'func',
  name: 'sheet',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

const available16 = ['@available(iOS 16.0, *)']

// the detent surface plus distractors a loose lookup would mistake for it: a
// custom-detent builder the sender cannot express and another type's medium.
const inventory: Declaration[] = [
  declaration({
    owner: 'SwiftUICore.View',
    name: 'presentationDetents',
    attributes: available16,
    parameters: [
      { label: '_', name: 'detents', type: 'Swift.Set<SwiftUI.PresentationDetent>' },
      { label: 'selection', name: 'selection', type: 'SwiftUICore.Binding<SwiftUI.PresentationDetent>' },
    ],
    requirements: [],
  }),
  ...(['medium', 'large'] as const).map((name) =>
    declaration({
      owner: 'PresentationDetent',
      kind: 'static',
      name,
      attributes: available16,
      parameters: [],
      type: 'SwiftUI.PresentationDetent',
      stored: true,
    })
  ),
  ...(['fraction', 'height'] as const).map((name) =>
    declaration({
      owner: 'PresentationDetent',
      kind: 'func',
      name,
      attributes: available16,
      parameters: [{ label: '_', name, type: 'CoreFoundation.CGFloat' }],
      type: 'SwiftUI.PresentationDetent',
      isStatic: true,
    })
  ),
  declaration({
    owner: 'PresentationDetent',
    kind: 'func',
    name: 'custom',
    attributes: available16,
    parameters: [{ label: '_', name: 'type', type: 'D.Type' }],
    type: 'SwiftUI.PresentationDetent',
    isStatic: true,
  }),
  declaration({
    owner: 'SidebarRowSize',
    kind: 'static',
    name: 'medium',
    attributes: available16,
    parameters: [],
    type: 'SidebarRowSize',
    stored: true,
  }),
]

const emit = (entries: readonly Declaration[] = inventory) => {
  const outputs = new Map<string, string>()
  emitSheet('', outputs, entries, 17, 27)
  return outputs
}

const specs = () => JSON.parse(JSON.stringify(sheetComponents))

describe('sheet host generation', () => {
  it('emits the controlled model with SDK detents and physical dismissal ownership', () => {
    const swift = emit().get('ios/Generated/OneNativeSheetView.swift')!
    expect(swift).toContain('final class OneNativeSheetModel: ObservableObject')
    expect(swift).toContain('@Published var controlled = OneNativeControlled(false)')
    expect(swift).toContain('@Published var detents: Set<PresentationDetent> = [.large]')
    expect(swift).toContain('@Published var selectedDetent = OneNativeControlled("")')
    expect(swift).toContain('case "medium": detent = .medium')
    expect(swift).toContain('case "large": detent = .large')
    expect(swift).toContain('case "fraction": detent = .fraction(value)')
    expect(swift).toContain('case "height": detent = .height(value)')
    expect(swift).toContain('default: preconditionFailure("invalid presentation detent")')
    // completion belongs to the mounted presentation: identity match, then the
    // active, accepted-close, generation and live-revision guards.
    expect(swift).toContain('guard let slot = presentedSlot, slot.identity == identity else { return }')
    expect(swift).toContain('presentedSlot = nil')
    expect(swift).toContain(
      'guard active, !controlled.value, slot.generation == presentationGeneration,'
    )
    expect(swift).toContain('slot.revision == controlled.revision else { return }')
    expect(swift).toContain('onDismiss?(slot.revision)')
    // a same-slot reopen adopts the mounted slot; a revision bump while
    // presented refreshes the live revision.
    expect(swift).toContain('presentedSlot = (slot.identity, presentationGeneration, controlled.revision)')
    expect(swift).toContain('presentedSlot = (slot.identity, slot.generation, controlled.revision)')
    expect(swift).toContain('func changeDetent(_ detent: PresentationDetent)')
    expect(swift).toContain('if controlsSelectedDetent {')
    expect(swift).toContain('abs(measuredHeight - height) >= 0.5')
  })

  it('falls back to the first detent when the selection leaves the set, and survives empty detents', () => {
    const swift = emit().get('ios/Generated/OneNativeSheetView.swift')!
    expect(swift).toContain('if !values.contains(where: { $0.key == model.selectedDetent.value }),')
    expect(swift).toContain('let first = values.first')
    expect(swift).toContain('model.selectedDetent = OneNativeControlled(first.key)')
    expect(swift).toContain('?? detentValues.first?.detent')
    expect(swift).toContain('?? .large')
  })

  it('emits the configure selector in order with hosting, weak wiring and reset', () => {
    const swift = emit().get('ios/Generated/OneNativeSheetView.swift')!
    const labels = [
      '_ isPresented: Bool',
      'acknowledgedEvent: Int',
      'revision: Int',
      'selectedDetentType: String',
      'selectedDetentValue: Double',
      'acknowledgedDetentEvent: Int',
      'detentRevision: Int',
      'interactiveDismissDisabled: Bool',
      'presentationDragIndicator: String',
      'presentationBackground: UIColor?',
      'presentationBackgroundInteraction: String',
      'presentationBackgroundInteractionDetentType: String',
      'presentationBackgroundInteractionDetentValue: Double',
      'presentationContentInteraction: String',
      'presentationSizing: String',
      'presentation: String',
      'colorScheme: String',
    ]
    let at = -1
    for (const label of labels) {
      const next = swift.indexOf(label, at + 1)
      expect(next, label).toBeGreaterThan(at)
      at = next
    }
    expect(swift).toContain('OneNativeHostingController(rootView: OneNativeSheetRoot(model: model), screenInsets: true)')
    expect(swift).toContain('model.onChange = { [weak self]')
    expect(swift).toContain('model.onDismiss = { [weak self]')
    expect(swift).toContain("controller?.presentedViewController?.dismiss(animated: false)")
    expect(swift).toContain('controller?.detach(); controller = nil; model = OneNativeSheetModel()')
  })

  it('emits Fabric glue with detent diffing, the configure call and the three events', () => {
    const mm = emit().get('ios/Generated/OneNativeSheetComponentView.mm')!
    expect(mm).toContain('_detentsDirty = YES;')
    expect(mm).toContain('next.detents[i].type != previous.detents[i].type')
    expect(mm).toContain('[_sheet setDetents:detents];')
    expect(mm).toContain('[_sheet configure:next.isPresented')
    expect(mm).toContain('presentationBackgroundInteractionDetentValue:next.presentationBackgroundInteractionDetentValue')
    expect(mm).toContain('presentationBackground:next.presentationBackground ? RCTUIColorFromSharedColor(next.presentationBackground) : nil')
    expect(mm).toContain('colorScheme:RCTNSStringFromString(next.colorScheme)];')
    expect(mm).toContain('onNativeSheetIsPresentedChange({.isPresented = (bool)value')
    expect(mm).toContain('onNativeSheetDismiss({.revision = (int)revision})')
    expect(mm).toContain('onNativeSheetDetentChange({')
    expect(mm).toContain('[content setMeasuredHeightCallback:^(CGFloat height)')
    expect(mm).toContain('[_sheet mountContent:child onLayout:')
    expect(mm).toContain('[(OneNativeSheetContentComponentView *)child setMeasuredHeightCallback:nil];')
    expect(mm).toContain('[_sheet unmountContent:child];')
    expect(mm).toContain('[super prepareForRecycle]; [_sheet reset]; _detentsDirty = YES;')
    const header = emit().get('ios/Generated/OneNativeSheetComponentView.h')!
    expect(header).toContain('@interface OneNativeSheetComponentView : RCTViewComponentView')
    expect(header).toContain('@interface OneNativeSheetContentComponentView : RCTViewComponentView')
    expect(header).toContain('- (void)setMeasuredHeightCallback:(void (^)(CGFloat height))callback;')
  })

  it('measures presented content height only and aliases the slot shadow node', () => {
    const mm = emit().get('ios/Generated/OneNativeSheetComponentView.mm')!
    expect(mm).toContain('CGFloat height = 0;')
    expect(mm).toContain('height = MAX(height, CGRectGetMaxY(subview.frame));')
    expect(mm).toContain('_measuredHeightCallback(height);')
    expect(mm).not.toContain('measuredWidth')
    expect(mm).toContain('RCTSurfaceTouchHandler')
    expect(mm).toContain('if (old.measured && old.size == size) return;')
    const shadow = emit().get('cpp/OneNativeSheetContentShadowNode.h')!
    expect(shadow).toContain('OneNativeSlotShadowNode<OneNativeSheetContentComponentName')
    expect(emit().get('cpp/OneNativeSheetContentShadowNode.cpp')!).toContain(
      'OneNativeSheetContentComponentName[] = "OneNativeSheetContent"'
    )
  })

  it('keeps the body, specs and sheet types while the removed API stays gone', () => {
    const outputs = emit()
    expect(outputs.get('ios/Generated/OneNativeSheetContent.swift')!).toContain('struct OneNativeSheetRoot: View')
    expect(outputs.get('src/platform/specs/OneNativeSheetNativeComponent.ts')!).toContain('NativeSheetDetent')
    expect(outputs.get('src/platform/generated/sheetTypes.ts')!).toContain("export type PresentationDetent")
    for (const [path, source] of outputs) {
      expect(source, path).not.toContain('fitToContents')
      expect(source, path).not.toContain('onDidDismiss')
      expect(source, path).not.toContain('DidDismiss')
    }
    expect(outputs.get('ios/Generated/OneNativeSheetView.swift')!).toContain('onDismiss')
  })

  it('rejects detent members the SDK does not declare in the sender shape', () => {
    const withoutHeight = inventory.filter(
      (entry) => !(entry.owner === 'PresentationDetent' && entry.name === 'height')
    )
    expect(() => emit(withoutHeight)).toThrow(
      'PresentationDetent has 0 scalar members named height taking the height shape'
    )
    const stringFraction = inventory.map((entry) =>
      entry.owner === 'PresentationDetent' && entry.name === 'fraction'
        ? { ...entry, parameters: [{ label: '_', name: 'fraction', type: 'Swift.String' }] }
        : entry
    )
    expect(() => emit(stringFraction)).toThrow(
      'PresentationDetent has 0 scalar members named fraction taking the fraction shape'
    )
    const withoutSelection = inventory.filter(
      (entry) => !(entry.name === 'presentationDetents' && entry.parameters.length === 2)
    )
    expect(() => emit(withoutSelection)).toThrow('expected one exact match, found 0')
  })

  it('rejects SDK facts newer than the floor or outside the ceiling', () => {
    const future = inventory.map((entry) =>
      entry.owner === 'PresentationDetent' && entry.name === 'large'
        ? { ...entry, attributes: ['@available(iOS 18.0, *)'] }
        : entry
    )
    expect(() => emit(future)).toThrow('PresentationDetent.large needs iOS 18, past the floor 17')
    const outputs = new Map<string, string>()
    expect(() => emitSheet('', outputs, inventory, 17, 15)).toThrow(
      'PresentationDetent has 0 values named medium taking the medium shape'
    )
  })

  it('rejects a spec surface the glue cannot fill', () => {
    const missing = specs()
    delete missing.find((entry: { name: string }) => entry.name === 'OneNativeSheet').props.colorScheme
    expect(() => validateSheetHost(inventory, 17, 27, missing)).toThrow(
      'configure prop colorScheme is not in the spec'
    )
    const reshaped = specs()
    reshaped.find((entry: { name: string }) => entry.name === 'OneNativeSheet').props.detents =
      'ReadonlyArray<string>'
    expect(() => validateSheetHost(inventory, 17, 27, reshaped)).toThrow(
      'not a NativeSheetDetent array'
    )
    const reworded = specs()
    reworded.find((entry: { name: string }) => entry.name === 'OneNativeSheet').events.onNativeSheetDismiss = {
      presented: 'boolean',
    }
    expect(() => validateSheetHost(inventory, 17, 27, reworded)).toThrow(
      'onNativeSheetDismiss must carry revision'
    )
    const contentless = specs().filter(
      (entry: { name: string }) => entry.name !== 'OneNativeSheetContent'
    )
    expect(() => validateSheetHost(inventory, 17, 27, contentless)).toThrow(
      'names no OneNativeSheetContent'
    )
  })

  it('rejects per-prop type drift and prefix lookalikes before emitting fixed-model glue', () => {
    const drifted = (prop: string, type: string) => {
      const next = specs()
      next.find((entry: { name: string }) => entry.name === 'OneNativeSheet').props[prop] = type
      return next
    }
    // a recognized primitive in the wrong slot would emit a configure param
    // the fixed model cannot read.
    expect(() => validateSheetHost(inventory, 17, 27, drifted('isPresented', 'string'))).toThrow(
      'configure prop isPresented carries string, not the boolean the model reads'
    )
    expect(
      () => validateSheetHost(inventory, 17, 27, drifted('selectedDetentValue', 'Int32'))
    ).toThrow(
      'configure prop selectedDetentValue carries Int32, not the Double the model reads'
    )
    // prefix lookalikes of recognized primitives are not convertible either.
    for (const [prop, type] of [
      ['isPresented', 'stringArray'],
      ['selectedDetentValue', 'stringArray'],
      ['revision', 'stringArray'],
    ] as const) {
      expect(() => validateSheetHost(inventory, 17, 27, drifted(prop, type))).toThrow(
        `configure prop ${prop} carries stringArray, not the`
      )
    }
  })
})
