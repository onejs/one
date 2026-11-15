import { describe, expect, it } from 'vitest'
import { components } from '../codegen/catalog'
import { containerComponents, contentComponents } from '../codegen/emitContainers'
import { emitTabViewHost, tabBarInterception, validateTabViewHost } from '../codegen/emitTabViewHost'
import type { Declaration } from '../codegen/inventory'

const declaration = (overrides: Partial<Declaration> = {}): Declaration => ({
  module: 'SwiftUI',
  owner: 'SwiftUI.View',
  kind: 'func',
  name: 'toolbarVisibility',
  attributes: [],
  parameters: [],
  line: 1,
  ...overrides,
})

const param = (label: string, type: string) => ({ label, name: label, type })

const available13 = ['@available(iOS 13.0, *)']
const available14 = ['@available(iOS 14.0, *)']
const available145 = ['@available(iOS 14.5, *)']
const available16 = ['@available(iOS 16.0, *)']
const available17 = ['@available(iOS 17.0, *)']
const available18 = ['@available(iOS 18.0, *)']
const available184 = ['@available(iOS 18.4, *)']
const available26 = ['@available(iOS 26.0, *)']
const available261 = ['@available(iOS 26.1, *)']
const available27 = ['@available(iOS 27.0, *)']
const deprecated = (introduced: string[]) => [...introduced, '@available(iOS, deprecated: 100000.0)']

const sectionRequirements = [
  'Content : SwiftUI.TabContent',
  'SelectionValue : Swift.Hashable',
  'Header == SwiftUICore.Text',
  'Footer == SwiftUICore.EmptyView',
  'S : Swift.StringProtocol',
]

// the TabView initializers, the String TabSection initializer, the
// TabViewCustomization round-trip, the View modifiers, every TabContent
// method the tabs call, the label styles, and the placements, plus
// overload distractors exact matching must skip.
const inventory: Declaration[] = [
  declaration({
    owner: 'TabView',
    kind: 'init',
    name: 'init',
    attributes: available18,
    parameters: [
      param('selection', 'SwiftUICore.Binding<SelectionValue>'),
      param('content', '() -> C'),
    ],
  }),
  declaration({
    owner: 'TabView',
    kind: 'init',
    name: 'init',
    attributes: deprecated(available13),
    parameters: [
      param('selection', 'SwiftUICore.Binding<SelectionValue>?'),
      param('content', '() -> Content'),
    ],
  }),
  declaration({
    owner: 'SwiftUI.TabView',
    kind: 'init',
    name: 'init',
    attributes: available13,
    parameters: [param('content', '() -> Content')],
  }),
  declaration({
    owner: 'SwiftUI.TabSection',
    kind: 'init',
    name: 'init',
    attributes: available18,
    parameters: [param('_', 'S'), param('content', '() -> Content')],
    requirements: sectionRequirements,
  }),
  declaration({
    owner: 'SwiftUI.TabSection',
    kind: 'init',
    name: 'init',
    attributes: available18,
    parameters: [param('_', 'S'), param('content', '() -> Content')],
    requirements: [...sectionRequirements, 'SelectionValue == V?', 'V : Swift.Hashable'],
  }),
  declaration({
    owner: '',
    kind: 'struct',
    name: 'TabViewCustomization',
    attributes: available18,
    parameters: [],
  }),
  declaration({
    owner: 'TabViewCustomization',
    kind: 'init',
    name: 'init',
    attributes: available18,
    parameters: [],
  }),
  declaration({
    owner: 'TabViewCustomization',
    kind: 'func',
    name: 'encode',
    attributes: available18,
    parameters: [param('to', 'any Swift.Encoder')],
  }),
  declaration({
    owner: 'TabViewCustomization',
    kind: 'init',
    name: 'init',
    attributes: available18,
    parameters: [param('from', 'any Swift.Decoder')],
  }),
  ...(
    [
      ['tabViewCustomization', [['_', 'SwiftUICore.Binding<SwiftUI.TabViewCustomization>?']], [], available18],
      ['tabViewBottomAccessory', [['isEnabled', 'Swift.Bool'], ['content', '() -> Content']], ['Content : SwiftUICore.View'], available261],
      ['toolbarVisibility', [['_', 'SwiftUICore.Visibility'], ['for', 'SwiftUI.ToolbarPlacement']], [], available18],
      ['labelStyle', [['_', 'S']], ['S : SwiftUI.LabelStyle'], available14],
      ['containerBackground', [['_', 'S'], ['for', 'SwiftUI.ContainerBackgroundPlacement']], ['S : SwiftUICore.ShapeStyle'], available17],
      ['toolbar', [['_', 'SwiftUICore.Visibility'], ['for', 'SwiftUI.ToolbarPlacement']], [], deprecated(available16)],
      ['tabItem', [['_', '() -> V']], ['V : SwiftUICore.View'], deprecated(available13)],
    ] as const
  ).map(([name, parameters, requirements, attributes]) =>
    declaration({
      owner: 'SwiftUICore.View',
      kind: 'func',
      name,
      attributes: [...attributes],
      parameters: parameters.map(([label, type]) => param(label, type)),
      requirements: [...requirements],
    })
  ),
  ...(
    [
      ['badge', [['_', 'SwiftUICore.Text?']], [], available18],
      ['hidden', [['_', 'Swift.Bool']], [], available18],
      ['accessibilityLabel', [['_', 'SwiftUICore.Text'], ['isEnabled', 'Swift.Bool']], [], available18],
      ['accessibilityHint', [['_', 'SwiftUICore.Text'], ['isEnabled', 'Swift.Bool']], [], available18],
      ['accessibilityValue', [['_', 'SwiftUICore.Text'], ['isEnabled', 'Swift.Bool']], [], available18],
      ['accessibilityIdentifier', [['_', 'Swift.String'], ['isEnabled', 'Swift.Bool']], [], available18],
      ['disabled', [['_', 'Swift.Bool']], [], available184],
      ['customizationID', [['_', 'Swift.String']], [], available18],
      ['customizationBehavior', [['_', 'SwiftUI.TabCustomizationBehavior'], ['for', 'SwiftUI.AdaptableTabBarPlacement']], [], available18],
      ['defaultVisibility', [['_', 'SwiftUICore.Visibility'], ['for', 'SwiftUI.AdaptableTabBarPlacement']], [], available18],
      ['springLoadingBehavior', [['_', 'SwiftUI.SpringLoadingBehavior']], [], available18],
      ['tabPlacement', [['_', 'SwiftUI.TabPlacement']], [], available18],
      ['sectionActions', [['content', '() -> Content']], ['Content : SwiftUICore.View'], available18],
      ['defaultSectionExpansion', [['_', 'SwiftUI.TabSectionExpansion']], [], available27],
      ['help', [['_', 'SwiftUICore.Text']], [], available27],
    ] as const
  ).map(([name, parameters, requirements, attributes]) =>
    declaration({
      owner: 'SwiftUI.TabContent',
      kind: 'func',
      name,
      attributes: [...attributes],
      parameters: parameters.map(([label, type]) => param(label, type)),
      requirements: [...requirements],
    })
  ),
  declaration({
    owner: 'SwiftUI.TabContent',
    kind: 'func',
    name: 'badge',
    attributes: available18,
    parameters: [param('_', 'Swift.Int')],
  }),
  declaration({
    owner: 'SwiftUI.TabContent',
    kind: 'func',
    name: 'help',
    attributes: available27,
    parameters: [param('_', 'SwiftUICore.LocalizedStringKey')],
  }),
  declaration({
    owner: 'SwiftUI.TabContent',
    kind: 'func',
    name: 'accessibilityLabel',
    attributes: available18,
    parameters: [param('_', 'S'), param('isEnabled', 'Swift.Bool')],
    requirements: ['S : Swift.StringProtocol'],
  }),
  ...(
    [
      ['automatic', 'SwiftUI.DefaultLabelStyle', available14],
      ['iconOnly', 'SwiftUI.IconOnlyLabelStyle', available14],
      ['titleAndIcon', 'SwiftUI.TitleAndIconLabelStyle', available145],
      ['titleOnly', 'SwiftUI.TitleOnlyLabelStyle', available14],
    ] as const
  ).map(([name, type, attributes]) =>
    declaration({
      owner: 'SwiftUI.LabelStyle',
      kind: 'static',
      name,
      attributes: [...attributes],
      parameters: [],
      type,
      requirements: [`Self == ${type}`],
    })
  ),
  declaration({
    owner: 'SwiftUI.ToolbarStyle',
    kind: 'static',
    name: 'automatic',
    attributes: available16,
    parameters: [],
    type: 'SwiftUI.AutomaticToolbarStyle',
    requirements: ['Self == SwiftUI.AutomaticToolbarStyle'],
  }),
  declaration({
    owner: 'ToolbarPlacement',
    kind: 'static',
    name: 'tabBar',
    attributes: available16,
    parameters: [],
    type: 'SwiftUI.ToolbarPlacement',
  }),
  declaration({
    owner: 'ContainerBackgroundPlacement',
    kind: 'static',
    name: 'navigation',
    attributes: available18,
    parameters: [],
    type: 'SwiftUI.ContainerBackgroundPlacement',
  }),
  ...(['inline', 'expanded'] as const).map((name) =>
    declaration({
      owner: 'TabViewBottomAccessoryPlacement',
      kind: 'static',
      name,
      attributes: available26,
      parameters: [],
      type: 'TabViewBottomAccessoryPlacement',
    })
  ),
  declaration({
    owner: 'SwiftUICore.EnvironmentValues',
    kind: 'var',
    name: 'tabViewBottomAccessoryPlacement',
    attributes: available26,
    parameters: [],
    type: 'SwiftUI.TabViewBottomAccessoryPlacement?',
  }),
]

const emit = (entries: readonly Declaration[] = inventory) => {
  const outputs = new Map<string, string>()
  emitTabViewHost('', outputs, entries, 17, 27)
  return outputs
}

const containerRows = () => JSON.parse(JSON.stringify([...containerComponents, ...contentComponents]))
const tabRows = () => JSON.parse(JSON.stringify(components))
const tabViewSpec = (rows: { name: string }[]) => rows.find((entry) => entry.name === 'OneNativeTabView')
const tabSpec = (rows: { name: string }[]) => rows.find((entry) => entry.name === 'OneNativeTab')

describe('tab view host generation', () => {
  it('emits the guarded selection model with mounted-page and revision semantics', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain(
      'guard active, pages.contains(where: { $0.id == id && $0.kind != "action" }) else { return }'
    )
    expect(swift).toContain('guard controlled.value != id else { return }')
    expect(swift).toContain('controlled.change(id)')
    expect(swift).toContain('onSelection?(id, controlled.eventCount, controlled.revision)')
    expect(swift).toContain('func press(_ id: String) {\n    if active { onAction?(id) }')
    expect(swift).toContain('if let next = model.controlled.applying(selection, acknowledged: acknowledgedEvent, revision: revision)')
  })

  it('groups sections in order and skips accessory and slot entries', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('case "section":')
    expect(swift).toContain('groups.append(TabGroup(id: page.id, section: page, tabs: []))')
    expect(swift).toContain('case "page", "action":')
    expect(swift).toContain('if let section = page.modifiers.section')
    expect(swift).toContain('default: continue')
    expect(swift).toContain('TabSection(section.title) {')
    expect(swift).toContain('.oneNativeSectionActions(section.modifiers.sectionActions, press: model.press)')
    expect(swift).toContain('guard groups.indices.contains(index), groups[index].section == nil else { return nil }')
  })

  it('intercepts action tabs and reselection through the explicit UIKit policy', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    for (const fragment of tabBarInterception) expect(swift).toContain(fragment)
    expect(swift).toContain('if page.kind == "action" {')
    expect(swift).toContain('model.press(page.id)\n        return false')
    expect(swift).toContain('if controller.selectedTab === tab { model.press(page.id) }')
    expect(swift).toContain('original?.responds(to: selector) == true ? original : nil')
    expect(swift).toContain('return original?.tabBarController?(controller, shouldSelectTab: tab) ?? true')
    expect(swift).toContain('if #unavailable(iOS 18.0), let model, model.active,')
    expect(swift).toContain('!(scrollView is UITextView)')
    expect(swift).toContain('while let current = next, current !== tabBarController {')
  })

  it('gates every availability branch on its mapped SDK version', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('if #available(iOS 18.0, *) {')
    expect(swift).toContain('} else {\n        legacyTabView\n      }')
    expect(swift).toContain('if let disabled, #available(iOS 18.4, *) { self.disabled(disabled) } else { self }')
    expect(swift).toContain('if #available(iOS 26.0, *), inline != nil || expanded != nil {')
    expect(swift).toContain('if #available(iOS 26.1, *) {')
    expect(swift).toContain('view.tabViewBottomAccessory(isEnabled: model.bottomAccessoryEnabled)')
    expect(swift).toContain('view.oneNativeViewSlot(OneNativeViewSlotName.tabViewBottomAccessory)')
    expect(swift).toContain('view.oneNativeViewSlot(page.id)')
    expect(swift).toContain('#if ONE_IOS_27_SDK')
    expect(swift).toContain('if let value, #available(iOS 27.0, *) {')
    expect(swift).toContain('self.defaultSectionExpansion(OneNativeGenerated.tabSectionExpansion(value))')
    expect(swift).toContain('if let text, #available(iOS 27.0, *) { self.help(Text(text)) } else { self }')
    expect(swift).toContain('@available(iOS 26.0, *)\nprivate struct AccessoryContent: View')
    expect(swift).toContain('placement == .expanded ? (expanded ?? inline) : (inline ?? expanded)')
  })

  it('round-trips customization JSON without decoding on read', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('var customizationBinding: Binding<TabViewCustomization>')
    expect(swift).toContain('(customization as? TabViewCustomization) ?? TabViewCustomization()')
    expect(swift).toContain('guard json != customizationJSON else { return }')
    expect(swift).toContain('if active { onCustomization?(json) }')
    expect(swift).toContain('guard #available(iOS 18.0, *) else { return }')
    expect(swift).toContain('if json.isEmpty { customization = TabViewCustomization(); return }')
    expect(swift).toContain('try JSONDecoder().decode(TabViewCustomization.self, from: Data(json.utf8))')
    expect(swift).toContain('view.tabViewCustomization(model.customizationBinding)')
    expect(swift).toContain('model.applyCustomization(customization)')
  })

  it('applies every TabContent modifier only where the React side set it', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('struct OneNativeTabModified<Content: TabContent>: TabContent')
    expect(swift).toContain('.hidden(m.hidden ?? false)')
    expect(swift).toContain('.accessibilityLabel(Text(m.accessibilityLabel ?? ""), isEnabled: m.accessibilityLabel != nil)')
    expect(swift).toContain('.accessibilityIdentifier(m.accessibilityIdentifier ?? "", isEnabled: m.accessibilityIdentifier != nil)')
    expect(swift).toContain('case 0: self.customizationBehavior(behavior)')
    expect(swift).toContain('default: self.customizationBehavior(behavior, for: p[0], p[1], p[2])')
    expect(swift).toContain('case 0: self.defaultVisibility(visibility)')
    expect(swift).toContain('default: self.defaultVisibility(visibility, for: p[0], p[1], p[2])')
    expect(swift).toContain('self.springLoadingBehavior(OneNativeGenerated.springLoadingBehavior(value))')
    expect(swift).toContain('self.tabPlacement(OneNativeGenerated.tabPlacement(value))')
    expect(swift).toContain('self.sectionActions {')
    expect(swift).toContain('press(action.id)')
    expect(swift).toContain('.badge(page.badge.isEmpty ? nil : Text(page.badge))')
    expect(swift).toContain('.toolbarVisibility(OneNativeGenerated.visibility(model.tabBarVisibility), for: .tabBar)')
    expect(swift).toContain('.toolbar(OneNativeGenerated.visibility(model.tabBarVisibility), for: .tabBar)')
    expect(swift).toContain('.containerBackground(.clear, for: .navigation)')
    expect(swift).toContain('case "titleAndIcon": self.labelStyle(.titleAndIcon)')
  })

  it('activates toolbars with the host and styles both trees', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('public final class OneNativeTabViewView: UIView, OneNativeToolbarHost')
    expect(swift).toContain('for toolbar in toolbars { toolbar.propagateActive(next) }')
    expect(swift).toContain('toolbar.composeInto(self)')
    expect(swift).toContain('model.toolbarEntries = toolbars.flatMap(\\.entries)')
    expect(swift).toContain('toolbar.decompose()')
    expect(swift).toContain('public func toolbarChanged() { publishToolbars() }')
    expect(swift).toContain('.oneNativeStyle(model.swiftStyle, emit: model.emitSDKEvent)')
    expect(swift).toContain('.oneNativeStyle(page.style, emit: page.emit)')
    expect(swift).toContain('if active { onSDKEvent?(name, value) }')
    expect(swift).toContain('ForEach(model.toolbarEntries) { entry in')
    expect(swift).toContain('OneNativeToolbarEntryContent(entry: entry)')
  })

  it('attaches the controller on window with weak callbacks and resets clean', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('if window == nil { detachController() }')
    expect(swift).toContain('else { attachController() }')
    expect(swift).toContain('guard window != nil else { return }')
    expect(swift).toContain('model.onSelection = { [weak self] id, count, revision in')
    expect(swift).toContain('model.onAction = { [weak self] id in')
    expect(swift).toContain('model.onCustomization = { [weak self] json in')
    expect(swift).toContain('model.onSDKEvent = { [weak self] name, value in')
    expect(swift).toContain('screenInsets: true')
    expect(swift).toContain('model.active = controller?.isAttached == true')
    expect(swift).toContain('model.onSelection = nil')
    expect(swift).toContain('model.onAction = nil')
    expect(swift).toContain('model.onCustomization = nil')
    expect(swift).toContain('model.onSDKEvent = nil')
    expect(swift).toContain('toolbars.removeAll()')
    expect(swift).toContain('controller = nil')
    expect(swift).toContain('model = TabViewModel()')
  })

  it('keeps keyed page identities stable and redraws late-disabled tabs', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    expect(swift).toContain('guard let current = mounted[page.id], current.view === page.view else { return page }')
    expect(swift).toContain('current.modifiers = page.modifiers')
    expect(swift).toContain('current.emit = page.emit')
    expect(swift).toContain('mounted[page.id].map { $0.modifiers.disabled != page.modifiers.disabled } ?? false')
    expect(swift).toContain('DispatchQueue.main.async { [weak self] in self?.redrawTabBarItems() }')
    expect(swift).toContain('item.badgeValue = badge == nil ? "" : nil')
  })

  it('emits Fabric glue with page items, toolbar kinds and the shared frame path', () => {
    const mm = emit().get('ios/Generated/OneNativeTabViewComponentView.mm')!
    expect(mm).toContain('OneNativeToolbarComponentView.class]')
    expect(mm).toContain(
      'NSAssert([child isKindOfClass:OneNativeTabComponentView.class], @"Swift.TabView requires Swift.Tab or Swift.Toolbar children")'
    )
    expect(mm).toContain('page.tabs = self;')
    expect(mm).toContain('[_pages insertObject:page atIndex:MIN(index, _pages.count)];')
    expect(mm).toContain('page.tabs = nil;')
    expect(mm).toContain('[_pages removeObjectIdenticalTo:page];')
    expect(mm).toContain('[page removeFromSuperview];')
    expect(mm).toContain('initWithId:page.tabId kind:page.kind title:page.title')
    expect(mm).toContain('role:page.role slotHeight:page.slotHeight tabModifiers:page.tabModifiers view:page')
    expect(mm).toContain('[item configureStyle:page.swiftStyle];')
    expect(mm).toContain('if (strongPage.tabs) [strongPage updateNativeFrame:frame];')
    expect(mm).toContain('[_tabView setPages:items];')
    expect(mm).toContain('emitter->onNativeTabViewSelectionChange(')
    expect(mm).toContain('emitter->onNativeTabViewAction(')
    expect(mm).toContain('emitter->onNativeTabViewCustomizationChange(')
    expect(mm).toContain('emitter->onNativeSDKEvent(')
    expect(mm).toContain('if (changed) [self.tabs invalidatePages];')
    expect(mm).toContain('[(OneNativeTabViewComponentView *)self.tabs pageContentChanged];')
    expect(mm).toContain('if (!_tabState || !std::isfinite(frame.size.width) || !std::isfinite(frame.size.height)) return;')
    expect(mm).toContain('if (old.measured && old.size == size && old.origin == origin) return;')
    expect(mm).toContain('self.frame = (CGRect){CGPointZero, self.bounds.size};')
    expect(mm).toContain('_tabState.reset();')
    const header = emit().get('ios/Generated/OneNativeTabViewComponentView.h')!
    expect(header).toContain('@protocol OneNativePageHost <NSObject>')
    expect(header).toContain('@interface OneNativeTabViewComponentView : RCTViewComponentView <OneNativePageHost>')
    expect(header).toContain('@interface OneNativeTabComponentView : RCTViewComponentView')
    expect(header).toContain('@property (nonatomic, weak, nullable) id<OneNativePageHost> tabs;')
    expect(header).toContain('@property (nonatomic, copy) NSString *tabId;')
    expect(header).toContain('@property (nonatomic, assign) CGFloat slotHeight;')
  })

  it('matches every Fabric call site to the Swift receiver it configures', () => {
    const mm = emit().get('ios/Generated/OneNativeTabViewComponentView.mm')!
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    for (const method of [
      'setPages(_ pages: [OneNativeTabItem])',
      'setSelection(_ selection: String, acknowledgedEvent: Int, revision: Int)',
      'configure(tabViewStyle: String, tabBarVisibility: String, customization: String, customizable: Bool, bottomAccessoryEnabled: Bool)',
      'configureStyle(_ style: [String: Any])',
      'mountToolbar(_ toolbar: OneNativeToolbarView)',
      'unmountToolbar(_ toolbar: OneNativeToolbarView)',
      'pageContentChanged()',
      'reset()',
    ]) {
      expect(swift).toContain(`public func ${method}`)
    }
    expect(mm).toContain('[_tabView configureWithTabViewStyle:RCTNSStringFromString(next.tabViewStyle)')
    expect(mm).toContain('tabBarVisibility:RCTNSStringFromString(next.tabBarVisibility)')
    expect(mm).toContain('customization:RCTNSStringFromString(next.customization)')
    expect(mm).toContain('customizable:next.customizable')
    expect(mm).toContain('bottomAccessoryEnabled:next.bottomAccessoryEnabled];')
    expect(mm).toContain(
      '[_tabView setSelection:RCTNSStringFromString(next.selection) acknowledgedEvent:next.acknowledgedEvent revision:next.revision];'
    )
    expect(mm).toContain('[_tabView configureStyle:OneNativeStyleDictionary(next.swiftStyle)];')
  })

  it('keeps the page host protocol and tab item singular for the Pager', () => {
    const swift = emit().get('ios/Generated/OneNativeTabViewView.swift')!
    const header = emit().get('ios/Generated/OneNativeTabViewComponentView.h')!
    expect(header).toContain('- (void)invalidatePages;')
    expect(swift).toContain('public final class OneNativeTabItem: NSObject, Identifiable')
    expect(swift).toContain(
      'public init(id: String, kind: String, title: String, systemImage: String, badge: String, role: String, slotHeight: CGFloat, tabModifiers: String, view: UIView, onLayout: @escaping (CGRect) -> Void)'
    )
    // the toolbar host protocol lives in the generated NavigationStack file; the
    // TabView conforms to it without redefining it.
    expect(swift).toContain('OneNativeToolbarHost')
    expect(swift).not.toContain('protocol OneNativeToolbarHost')
    const shadowH = emit().get('cpp/OneNativeTabShadowNode.h')!
    expect(shadowH).toContain('using OneNativeTabState = OneNativeSlotState;')
    expect(shadowH).toContain('using OneNativeTabShadowNode = OneNativeSlotShadowNode<')
  })

  it('rejects SDK facts the hosts cannot emit against', () => {
    const withoutModern = inventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'TabView' &&
          entry.parameters[0]?.type === 'SwiftUICore.Binding<SelectionValue>'
        )
    )
    expect(() => emit(withoutModern)).toThrow('SDK constructor signature changed: TabView(')
    const withoutLegacy = inventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'TabView' &&
          entry.parameters[0]?.type === 'SwiftUICore.Binding<SelectionValue>?'
        )
    )
    expect(() => emit(withoutLegacy)).toThrow('SDK constructor signature changed: TabView(')
    // the V? section overload alone never matches: requirements select the overload.
    const optionalSectionOnly = inventory.filter(
      (entry) =>
        !(
          entry.kind === 'init' &&
          entry.owner === 'SwiftUI.TabSection' &&
          (entry.requirements ?? []).length === 5
        )
    )
    expect(() => emit(optionalSectionOnly)).toThrow('SDK constructor signature changed: TabSection(')
    const withoutTabContent = inventory.filter(
      (entry) => !(entry.owner === 'SwiftUI.TabContent' && entry.name === 'sectionActions')
    )
    expect(() => emit(withoutTabContent)).toThrow(
      'SDK TabContent sectionActions: expected one exact match, found 0'
    )
    const withoutCustomization = inventory.filter(
      (entry) => !(entry.owner === 'SwiftUICore.View' && entry.name === 'tabViewCustomization')
    )
    expect(() => emit(withoutCustomization)).toThrow(
      'SDK modifier tabViewCustomization: expected one exact match, found 0'
    )
    const withoutEnvironment = inventory.filter(
      (entry) => entry.name !== 'tabViewBottomAccessoryPlacement'
    )
    expect(() => emit(withoutEnvironment)).toThrow(
      'EnvironmentValues has 0 tabViewBottomAccessoryPlacement keys'
    )
    const withoutEncoder = inventory.filter(
      (entry) => !(entry.owner === 'TabViewCustomization' && entry.name === 'encode')
    )
    expect(() => emit(withoutEncoder)).toThrow('TabViewCustomization has 0 encoders')
  })

  it('pins exact SDK versions and keeps ungated calls at or below the floor', () => {
    const matured = inventory.map((entry) =>
      entry.owner === 'SwiftUI.TabContent' && entry.name === 'disabled'
        ? { ...entry, attributes: ['@available(iOS 19.0, *)'] }
        : entry
    )
    expect(() => emit(matured)).toThrow('TabContent.disabled ships iOS 19, not the 18.4 the host gates on')
    const lifted = inventory.map((entry) =>
      entry.name === 'labelStyle' ? { ...entry, attributes: ['@available(iOS 18.0, *)'] } : entry
    )
    expect(() => emit(lifted)).toThrow('labelStyle ships iOS 18, not the 14 the host gates on')
    const aboveFloor = inventory.map((entry) =>
      entry.name === 'tabBar' ? { ...entry, attributes: ['@available(iOS 18.0, *)'] } : entry
    )
    expect(() => emit(aboveFloor)).toThrow(
      'ToolbarPlacement.tabBar ships iOS 18, not the 16 the host gates on'
    )
    const outputs = new Map<string, string>()
    expect(() => emitTabViewHost('', outputs, inventory, 17, 15)).toThrow(
      'TabView(selection:content:) needs iOS 18, past the ceiling 15'
    )
  })

  it('rejects a spec surface the glue cannot fill, including type lookalikes', () => {
    const drifted = containerRows()
    tabViewSpec(drifted).props.customizable = 'string'
    expect(() => validateTabViewHost(inventory, 17, 27, drifted, tabRows())).toThrow(
      'configure prop customizable carries string, not the boolean the model reads'
    )
    const lookalike = tabRows()
    tabSpec(lookalike).props.slotHeight = 'double'
    expect(() => validateTabViewHost(inventory, 17, 27, containerRows(), lookalike)).toThrow(
      'item prop slotHeight carries double, not the Double the item reads'
    )
    const reworded = containerRows()
    delete tabViewSpec(reworded).events.onNativeTabViewAction
    expect(() => validateTabViewHost(inventory, 17, 27, reworded, tabRows())).toThrow(
      'event onNativeTabViewAction is not in the spec'
    )
    const remapped = containerRows()
    tabViewSpec(remapped).enumProps = { tabViewStyle: 'TabViewStyle' }
    expect(() => validateTabViewHost(inventory, 17, 27, remapped, tabRows())).toThrow(
      'OneNativeTabView maps tabViewStyle and tabBarVisibility to the tab enums'
    )
    const uncontrolled = containerRows()
    tabViewSpec(uncontrolled).controlled = { value: 'selection', event: 'onNativeTabViewAction' }
    expect(() => validateTabViewHost(inventory, 17, 27, uncontrolled, tabRows())).toThrow(
      'OneNativeTabView controls selection through onNativeTabViewSelectionChange'
    )
    const unkeyed = containerRows()
    tabViewSpec(unkeyed).slots = []
    expect(() => validateTabViewHost(inventory, 17, 27, unkeyed, tabRows())).toThrow(
      'OneNativeTabView carries many OneNativeTab pages keyed by tabId'
    )
    const unstyled = tabRows()
    delete tabSpec(unstyled).swiftStyle
    expect(() => validateTabViewHost(inventory, 17, 27, containerRows(), unstyled)).toThrow(
      'OneNativeTab styles through swiftStyle'
    )
    const inline = tabRows()
    tabSpec(inline).interfaceOnly = false
    expect(() => validateTabViewHost(inventory, 17, 27, containerRows(), inline)).toThrow(
      'OneNativeTab stays interface-only'
    )
  })
})
