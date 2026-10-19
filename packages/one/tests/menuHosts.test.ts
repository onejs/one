import { describe, expect, it } from 'vitest'
import { components } from '../codegen/catalog'
import { emitMenuHost, validateMenuHost } from '../codegen/emitMenuHost'
import type { Declaration } from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'SwiftUI.View',
  kind: 'func',
  name: 'menuStyle',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

const available16 = ['@available(iOS 16.0, *)']

// the root Menu initializers, the three fixed style members and their
// modifiers, plus distractors a loose lookup would mistake for them.
const inventory: Declaration[] = [
  declaration({
    owner: 'SwiftUI.Menu',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [
      { label: 'content', name: 'content', type: '() -> Content' },
      { label: 'label', name: 'label', type: '() -> Label' },
    ],
  }),
  declaration({
    owner: 'SwiftUI.Menu',
    kind: 'init',
    name: 'init',
    attributes: available16,
    parameters: [
      { label: 'content', name: 'content', type: '() -> Content' },
      { label: 'label', name: 'label', type: '() -> Label' },
      { label: 'primaryAction', name: 'primaryAction', type: '@escaping () -> Swift.Void' },
    ],
  }),
  ...(
    [
      ['menuStyle', 'S : SwiftUI.MenuStyle'],
      ['buttonStyle', 'S : SwiftUI.PrimitiveButtonStyle'],
      ['pickerStyle', 'S : SwiftUI.PickerStyle'],
    ] as const
  ).map(([name, requirement]) =>
    declaration({
      owner: 'SwiftUICore.View',
      kind: 'func',
      name,
      attributes: available16,
      parameters: [{ label: '_', name: 'style', type: 'S' }],
      type: 'some SwiftUICore.View',
      requirements: [requirement],
    })
  ),
  ...(
    [
      ['button', 'SwiftUI.MenuStyle', 'SwiftUI.ButtonMenuStyle'],
      ['plain', 'SwiftUI.PrimitiveButtonStyle', 'SwiftUI.PlainButtonStyle'],
      ['menu', 'SwiftUI.PickerStyle', 'SwiftUI.MenuPickerStyle'],
    ] as const
  ).map(([name, owner, type]) =>
    declaration({
      owner,
      kind: 'static',
      name,
      attributes: available16,
      parameters: [],
      type,
      requirements: [`Self == ${type}`],
    })
  ),
  declaration({
    owner: 'SwiftUI.MenuBarExtraStyle',
    kind: 'static',
    name: 'menu',
    attributes: available16,
    parameters: [],
    type: 'SwiftUI.PullDownMenuBarExtraStyle',
    requirements: ['Self == SwiftUI.PullDownMenuBarExtraStyle'],
  }),
  declaration({
    owner: 'SwiftUI.ToggleStyle',
    kind: 'static',
    name: 'button',
    attributes: available16,
    parameters: [],
    type: 'SwiftUI.ButtonToggleStyle',
    requirements: ['Self == SwiftUI.ButtonToggleStyle'],
  }),
]

const emit = (entries: readonly Declaration[] = inventory) => {
  const outputs = new Map<string, string>()
  emitMenuHost('', outputs, entries, 17, 27)
  return outputs
}

const menuSpec = () =>
  JSON.parse(JSON.stringify(components.find((entry) => entry.name === 'OneNativeMenu')))

describe('menu host generation', () => {
  it('emits the guarded model with independent toggle and picker controls', () => {
    const swift = emit().get('ios/Generated/OneNativeMenuView.swift')!
    expect(swift).toContain('@Published var controlled = OneNativeControlled<[String: [Bool]]>([:])')
    expect(swift).toContain('@Published var pickerControlled = OneNativeControlled<[String: String]>([:])')
    expect(swift).toContain(
      'guard active, !disabled, let item = items[id], item.type == .action, !item.disabled, !item.hidden else { return }'
    )
    expect(swift).toContain('guard active, !disabled, hasPrimaryAction else { return }')
    expect(swift).toContain('item.values.indices.contains(index) else { return }')
    expect(swift).toContain(
      'guard var values = controlled.value[id], values.indices.contains(index), values[index] != value else { return }'
    )
    expect(swift).toContain('onValueChange?(id, value, index, controlled.eventCount, controlled.revision)')
    expect(swift).toContain(
      'let option = items[value], option.parentId == id, option.type == .action,'
    )
    expect(swift).toContain('!option.disabled, !option.hidden else { return }')
    expect(swift).toContain('guard next[id] != value else { return }')
    expect(swift).toContain('onPickerChange?(id, value, pickerControlled.eventCount, pickerControlled.revision)')
  })

  it('emits trigger transport, item grouping and the configure selector in order', () => {
    const swift = emit().get('ios/Generated/OneNativeMenuView.swift')!
    expect(swift).toContain('precondition(model.trigger == nil, "Swift.Menu expects one RN trigger container")')
    expect(swift).toContain('if model.trigger === view { model.trigger = nil }')
    expect(swift).toContain('model.items = Dictionary(uniqueKeysWithValues: nodes.map { ($0.id, $0) })')
    expect(swift).toContain('model.children = Dictionary(grouping: nodes, by: \\.parentId)')
    const labels = [
      '_ triggerLabel: String',
      'disabled: Bool',
      'hasPrimaryAction: Bool',
      'menuOrder: String',
      'menuActionDismissBehavior: String',
      'presentation: String',
      'acknowledgedEvent: Int',
      'pickerAcknowledgedEvent: Int',
      'revision: Int',
    ]
    let at = -1
    for (const label of labels) {
      const next = swift.indexOf(label, at + 1)
      expect(next, label).toBeGreaterThan(at)
      at = next
    }
    expect(swift).toContain(
      'model.controlled.applying(model.propValues, acknowledged: acknowledgedEvent, revision: revision)'
    )
    expect(swift).toContain(
      'model.pickerControlled.applying(model.propPickerValues, acknowledged: pickerAcknowledgedEvent, revision: revision)'
    )
  })

  it('switches presentation without a hosting controller per context row', () => {
    const swift = emit().get('ios/Generated/OneNativeMenuView.swift')!
    expect(swift).toContain('if model.presentation == "contextMenu" {')
    expect(swift).toContain('controller?.detach()\n      controller = nil')
    expect(swift).toContain('if trigger.superview !== self { addSubview(trigger) }')
    expect(swift).toContain('let interaction = UIContextMenuInteraction(delegate: self)')
    expect(swift).toContain('isUserInteractionEnabled = !model.disabled')
    expect(swift).toContain('removeInteraction(contextMenu)')
    expect(swift).toContain('controller = OneNativeHostingController(rootView: OneNativeMenuRoot(model: model))')
    expect(swift).toContain('model.active = controller?.isAttached == true')
    expect(swift).toContain('model.trigger?.removeFromSuperview()')
    expect(swift).toContain('controller = nil\n    model = OneNativeMenuModel()')
  })

  it('emits the primary-action root variants and the menu-styled picker', () => {
    const swift = emit().get('ios/Generated/OneNativeMenuView.swift')!
    expect(swift).toContain('if model.hasPrimaryAction {')
    expect(swift).toContain('} primaryAction: {\n          model.primaryAction()\n        }')
    expect(swift).toContain('.menuStyle(.button)')
    expect(swift).toContain('.buttonStyle(.plain)')
    expect(swift).toContain('.accessibilityLabel(model.label)')
    expect(swift).toContain('OneNativeSlot(content: trigger, mode: .passive)')
    expect(swift).toContain('.position(x: model.size.width / 2, y: model.size.height / 2)')
    expect(swift).toContain('get: { model.pickerControlled.value[item.id] ?? item.selection }')
    expect(swift).toContain('.tag(option.id)')
    expect(swift).toContain('.pickerStyle(.menu)')
  })

  it('mirrors menu content into UIKit with grouping, inheritance and roles', () => {
    const swift = emit().get('ios/Generated/OneNativeMenuView.swift')!
    expect(swift).toContain('UIContextMenuConfiguration(identifier: nil, previewProvider: nil)')
    expect(swift).toContain('UIMenu(children: self.menuElements("", dismiss: self.model.menuActionDismissBehavior, disabled: false))')
    expect(swift).toContain('groups.append(UIMenu(options: .displayInline, children: run))')
    expect(swift).toContain('if groups.isEmpty { return run }')
    expect(swift).toContain('let itemDisabled = disabled || item.disabled')
    expect(swift).toContain('if item.role == "destructive" { action.attributes.insert(.destructive) }')
    expect(swift).toContain('if itemDismiss == "disabled" { action.attributes.insert(.keepsMenuPresented) }')
    expect(swift).toContain('on ? .on : values.contains(true) ? .mixed : .off')
    expect(swift).toContain('options: .singleSelection')
    expect(swift).toContain('options: [.displayInline, .displayAsPalette]')
    expect(swift).toContain('menu.preferredElementSize = .small')
    expect(swift).toContain('menu.preferredElementSize = .medium')
    expect(swift).toContain('case "priority": return .priority')
  })

  it('emits Fabric glue with the items diff, configure call and four events', () => {
    const mm = emit().get('ios/Generated/OneNativeMenuComponentView.mm')!
    expect(mm).toContain('_itemsDirty = YES;')
    expect(mm).toContain('!OneNativeMenuItemsEqual(previous.items, next.items)')
    expect(mm).toContain('[_menuView configureItems:OneNativeMenuPayload(next.items)];')
    expect(mm).toContain('[_menuView configure:RCTNSStringFromString(next.triggerLabel)')
    expect(mm).toContain('hasPrimaryAction:next.hasPrimaryAction')
    expect(mm).toContain('pickerAcknowledgedEvent:next.pickerAcknowledgedEvent')
    expect(mm).toContain('revision:next.revision];')
    expect(mm).toContain('onNativeMenuAction({.id = std::string(identifier.UTF8String)})')
    expect(mm).toContain('onNativeMenuPrimaryAction({.kind = std::string("primary")})')
    expect(mm).toContain('.sourceIndex = (int)sourceIndex, .eventCount = (int)eventCount, .revision = (int)revision')
    expect(mm).toContain('[_menuView mountTrigger:child];')
    expect(mm).toContain('[_menuView unmountTrigger:child];')
    expect(mm).toContain('_menuView.frame = self.bounds;')
    expect(mm).toContain('[super prepareForRecycle];\n  [_menuView reset];\n  _itemsDirty = YES;')
    const header = emit().get('ios/Generated/OneNativeMenuComponentView.h')!
    expect(header).toContain('@interface OneNativeMenuComponentView : RCTViewComponentView')
  })

  it('rejects SDK facts the host cannot emit against', () => {
    const withoutPrimary = inventory.filter(
      (entry) => !(entry.owner === 'SwiftUI.Menu' && entry.parameters.some((p) => p.label === 'primaryAction'))
    )
    expect(() => emit(withoutPrimary)).toThrow('SDK constructor signature changed: Menu(')
    const withoutMember = inventory.filter(
      (entry) => !(entry.owner === 'SwiftUI.MenuStyle' && entry.name === 'button')
    )
    expect(() => emit(withoutMember)).toThrow(
      'SwiftUI.MenuStyle has 0 members spelling .button'
    )
    const misrequired = inventory.map((entry) =>
      entry.owner === 'SwiftUI.PickerStyle' && entry.name === 'menu'
        ? { ...entry, requirements: ['Self == SwiftUI.OtherStyle'] }
        : entry
    )
    expect(() => emit(misrequired)).toThrow('SwiftUI.PickerStyle has 0 members spelling .menu')
    const withoutModifier = inventory.filter(
      (entry) => !(entry.name === 'pickerStyle' && (entry.requirements ?? []).includes('S : SwiftUI.PickerStyle'))
    )
    expect(() => emit(withoutModifier)).toThrow('expected one exact match, found 0')
  })

  it('rejects members newer than the floor or outside the ceiling', () => {
    const future = inventory.map((entry) =>
      entry.owner === 'SwiftUI.MenuStyle' && entry.name === 'button'
        ? { ...entry, attributes: ['@available(iOS 18.0, *)'] }
        : entry
    )
    expect(() => emit(future)).toThrow(
      'SwiftUI.MenuStyle.button needs iOS 18, past the floor 17'
    )
    const outputs = new Map<string, string>()
    expect(() => emitMenuHost('', outputs, inventory, 17, 15)).toThrow(
      'SwiftUI.MenuStyle has 0 members spelling .button'
    )
  })

  it('rejects a spec surface the glue cannot fill, including type lookalikes', () => {
    const missing = menuSpec()
    delete missing.props.presentation
    expect(() => validateMenuHost(inventory, 17, 27, missing)).toThrow(
      'configure prop presentation is not in the spec'
    )
    const drifted = menuSpec()
    drifted.props.disabled = 'string'
    expect(() => validateMenuHost(inventory, 17, 27, drifted)).toThrow(
      'configure prop disabled carries string, not the boolean the model reads'
    )
    const lookalike = menuSpec()
    lookalike.props.revision = 'stringArray'
    expect(() => validateMenuHost(inventory, 17, 27, lookalike)).toThrow(
      'configure prop revision carries stringArray, not the Int32 the model reads'
    )
    const reshaped = menuSpec()
    reshaped.props.items = 'ReadonlyArray<string>'
    expect(() => validateMenuHost(inventory, 17, 27, reshaped)).toThrow(
      'not a NativeMenuItem array'
    )
    const reworded = menuSpec()
    reworded.events.onNativeMenuValueChange = { id: 'string', value: 'boolean' }
    expect(() => validateMenuHost(inventory, 17, 27, reworded)).toThrow(
      'onNativeMenuValueChange must carry id, value, sourceIndex, eventCount, revision'
    )
  })
})
